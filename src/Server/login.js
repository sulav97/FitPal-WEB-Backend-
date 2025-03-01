require("dotenv").config({ path: __dirname + "/.env" });

const express = require("express");
const path = require("path");
const cors = require("cors");
const connection = require("./db");

// Debugging: Print environment variables
console.log("Loaded OpenAI API Key:", process.env.OPENAI_API_KEY ? "✅ Loaded" : "❌ Not Found");
console.log("Loaded Port:", process.env.PORT);
console.log("Loaded MongoDB URL:", process.env.MONGO_URL);

// Ensure DB connection
connection();

const app = express();

// ✅ CORS Middleware (Properly Configured)
const allowedOrigins = ["https://habits-development.netlify.app", "http://localhost:3050", "http://localhost:8080"];

app.use(cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}));

// ✅ Handle Preflight (OPTIONS) Requests
app.options("*", cors());

// ✅ Middleware
app.use(express.json());

// ✅ Routes
app.use("/api/users", require("./routes/user"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/workout", require("./routes/workout"));
app.use("/api/calories", require("./routes/calorie"));
app.use("/api/calc", require("./routes/caloriecalc"));
app.use("/api/profile", require("./routes/profile"));
app.use("/api/AI", require("./routes/AI"));
app.use("/api/FitBit", require("./routes/FitBit"));

// ✅ Serve Static Files
app.use(express.static(path.join(__dirname, "../../build")));

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../../build", "index.html"));
});
app.get("/ujan", (req, res) => {
    res.json({"mi":"ok"});
});

// ✅ Start Server
const port = process.env.PORT || 8080;
app.listen(port, "0.0.0.0", () => console.log(`🚀 Server running on port ${port}...`));
