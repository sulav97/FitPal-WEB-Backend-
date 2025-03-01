const express = require("express");
const cors = require("cors");
const { User, validate } = require("../models/user");
const Token = require("../models/token");
const crypto = require("crypto");
const jwt=require('jsonwebtoken')
const sendEmail = require("../utils/SendEmail");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../utils/.env") });

const router = express.Router();

// ✅ Enable CORS for this route
router.use(cors({
    origin: ["https://habits-development.netlify.app", "http://localhost:3050", "http://localhost:8080"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}));

// ✅ Handle Preflight Requests
router.options("*", cors());

// ✅ User Registration with Email Verification
router.post("/token", async (req, res) => {
    try {
        const { error } = validate(req.body);
        if (error) return res.status(400).send({ message: error.details[0].message });

        let user = await User.findOne({ email: req.body.email });
        if (user) return res.status(409).send({ message: "User with given email already exists!" });

        const salt = await bcrypt.genSalt(Number(process.env.SALT));
        const hashPassword = await bcrypt.hash(req.body.password, salt);

        user = await new User({ ...req.body, password: hashPassword }).save();

        const token = await new Token({
            userId: user._id,
            token: crypto.randomBytes(32).toString("hex"),
        }).save();

        const url = `https://mustang-central-eb5dd97b4796.herokuapp.com/api/users/${user._id}/verify/${token.token}`;
        await sendEmail(user.email, "Verify Email", url);

        res.status(201).send({ message: "An email was sent to your account. Please verify." });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Internal Server Error", error: error.message });
    }
});

router.post("/register", async (req, res) => {
    try {
        const { firstName, lastName, nickName, email, password, confirmPassword } = req.body;

        // Validation
        if (!firstName || !lastName || !nickName || !email || !password || !confirmPassword) {
            return res.status(400).json({ error: "All fields are required" });
        }
        if (password !== confirmPassword) {
            return res.status(400).json({ error: "Passwords do not match" });
        }

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "Email already in use" });
        }

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Save user
        const newUser = new User({ firstName, lastName, nickName, email, password: hashedPassword });
        await newUser.save();

        // Generate JWT Token
        const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

        res.status(201).json({ message: "User registered successfully", token });
    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// ✅ Email Verification & Redirect to Frontend
router.get("/:id/verify/:token/", async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.params.id });
        if (!user) return res.status(400).send({ message: "Invalid link" });

        const token = await Token.findOne({
            userId: user._id,
            token: req.params.token,
        });

        if (!token) {
            console.log("Token Issue");
            return res.redirect("https://habits-development.netlify.app");
        }

        if (user && token) {
            await User.updateOne({ _id: user._id }, { $set: { verified: true } });
            await Token.deleteOne({ _id: token._id });
            res.redirect("https://habits-development.netlify.app");
        }

    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Server Error", error: error.message });
    }
});

module.exports = router;
