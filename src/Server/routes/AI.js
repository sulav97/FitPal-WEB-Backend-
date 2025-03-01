require("dotenv").config({ path: __dirname + "/../.env" }); // Ensure correct env loading

const express = require("express");
const OpenAI = require("openai");

const router = express.Router();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "", // Ensure fallback
});

// Debugging
console.log("AI Route - OpenAI API Key:", process.env.OPENAI_API_KEY ? "✅ Loaded" : "❌ Not Found");

router.post("/generate", async (req, res) => {
    try {
        const response = await openai.completions.create({
            model: "gpt-4",
            prompt: req.body.prompt,
            max_tokens: 100,
        });

        res.json({ response: response.choices[0].text.trim() });
    } catch (error) {
        console.error("❌ OpenAI API Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
