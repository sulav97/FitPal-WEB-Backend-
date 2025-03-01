const jwt = require('jsonwebtoken');
require('../Server/models/user')
// const { User } = require('../server/models/user'); // Uncomment if using User model
const JWTPRIVATEKEY= "nUnhO+b/IJ2viBa/dbaFlBMmwkcUht99s/Hn681YqVY="
const express = require('express');
require('../Server/db')


// Include other models or utilities as needed


const router = express.Router();
require('dotenv').config();
const auth = async (req, res, next) => {
    try {
        console.log(req.headers);
        const token = req.header('Authorization');

        if (!token) {
            return res.status(401).send('Access denied. No token provided.');
        }

        if (!token.startsWith('Bearer ')) {
            return res.status(401).send('Access denied. Invalid token format.');
        }
        if (!JWTPRIVATEKEY) {
            throw new Error('FATAL ERROR: JWTPRIVATEKEY is not defined.');
        }
        

        const cleanedToken = token.replace('Bearer ', '');
        console.log(cleanedToken)
        const decoded = jwt.verify(cleanedToken, JWTPRIVATEKEY);
console.log(decoded);
        // Optionally fetch user details from the database
        // const user = await User.findById(decoded._id);
        // if (!user) {
        //     return res.status(400).send('Invalid token.');
        // }
        // req.user = user;

        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            res.status(401).send('Invalid token.');
        } else {
            console.error('Auth.js Server Error:', error);
            res.status(500).send(' Server Error');
        }
    }
};



module.exports = auth;
