const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const router = express.Router();
dotenv.config();
const qs = require('qs');
// Fitbit credentials from environment variables
const clientId = process.env.FITBIT_CLIENT_ID;
const clientSecret = process.env.FITBIT_CLIENT_SECRET;
const redirectUri = "http://localhost:3050/FitBit"; // Must match the redirect URI in Fitbit Developer settings


const baseURL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:8080/'
  : 'https://mustang-central-eb5dd97b4796.herokuapp.com/';

// In-memory cache for tokens (for simplicity; replace with a proper database in production)
const tokenCache = {};

// Endpoint to exchange authorization code for an access token
router.post("/token", async (req, res) => {
    try {
        

        const { code,verifier } = req.body;

        if (!code) {
            return res.status(400).json({ error: "Authorization code is missing." });
        }

        // Check if the token for this code is already in the cache
        if (tokenCache[code]) {
            console.log("Token served from cache");
            return res.json({ access_token: tokenCache[code] });
        }

        const authHeader = 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64');

        
        
        const response = await axios.post(
            "https://api.fitbit.com/oauth2/token",
            qs.stringify({
                client_id: clientId,
                grant_type: "authorization_code",
                redirect_uri: redirectUri,
                code,
                code_verifier:verifier,
            }),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Authorization": authHeader,
                },
            }
        );

        const { access_token } = response.data;

        // Cache the access token
        tokenCache[code] = access_token;

        // Return the access token
        res.json({ access_token });
    } catch (error) {
        console.error("Error exchanging authorization code:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to exchange authorization code." });
    }
});

// Endpoint to fetch Fitbit user profile data
router.get("/profile", async (req, res) => {
    try {
        const accessToken = req.headers.accesstoken;

        if (!accessToken) {
            return res.status(400).json({ error: "Access token is missing." });
        }

        // Fetch user profile data from Fitbit API
        const response = await axios.get("https://api.fitbit.com/1/user/-/profile.json", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        res.json(response.data);
    } catch (error) {
        console.error("Error fetching profile data:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch profile data." });
    }
});

module.exports = router;
