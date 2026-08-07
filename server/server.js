const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const morgan = require("morgan");
const mongoose = require("mongoose");

const authRoutes = require("./routes/authRoutes");
const { protect } = require("./middleware/authMiddleware");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.use("/api/auth", authRoutes);

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB connected successfully");
    })
    .catch((error) => {
        console.log("MongoDB connection error:");
        console.log(error.message);
    });

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "WAYNE LOGS API is working"
    });
});

app.get("/api/test", (req, res) => {
    res.json({
        success: true,
        message: "Backend connection successful"
    });
});

app.get("/api/protected", protect, (req, res) => {
    res.json({
        success: true,
        message: "Protected route is working",
        user: req.user
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log("");
    console.log("=================================");
    console.log(" WAYNE LOGS SERVER IS RUNNING");
    console.log(` http://localhost:${PORT}`);
    console.log("=================================");
    console.log("");
});