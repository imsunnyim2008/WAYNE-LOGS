const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const morgan = require("morgan");
const mongoose = require("mongoose");

dotenv.config();

const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");

const { protect } = require("./middleware/authMiddleware");

const app = express();


// ===============================
// MIDDLEWARE
// ===============================

app.use(cors());

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);

app.use(morgan("dev"));


// ===============================
// API ROUTES
// ===============================

app.use(
    "/api/auth",
    authRoutes
);

app.use(
    "/api/products",
    productRoutes
);


// ===============================
// MONGODB CONNECTION
// ===============================

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {

        console.log(
            "MongoDB connected successfully"
        );

    })
    .catch((error) => {

        console.log(
            "MongoDB connection error:"
        );

        console.log(
            error.message
        );

    });


// ===============================
// HOME API TEST
// ===============================

app.get(
    "/",
    (req, res) => {

        res.json({
            success: true,
            message:
                "WAYNE LOGS API is working"
        });

    }
);


// ===============================
// BACKEND TEST ROUTE
// ===============================

app.get(
    "/api/test",
    (req, res) => {

        res.json({
            success: true,
            message:
                "Backend connection successful"
        });

    }
);


// ===============================
// PROTECTED USER TEST
// ===============================

app.get(
    "/api/protected",
    protect,
    (req, res) => {

        res.json({
            success: true,
            message:
                "Protected route is working",
            user: req.user
        });

    }
);


// ===============================
// 404 API ROUTE
// ===============================

app.use(
    "/api",
    (req, res) => {

        res.status(404).json({
            success: false,
            message:
                "API route not found"
        });

    }
);


// ===============================
// SERVER
// ===============================

const PORT =
    process.env.PORT || 5000;

app.listen(
    PORT,
    () => {

        console.log("");

        console.log(
            "================================="
        );

        console.log(
            " WAYNE LOGS SERVER IS RUNNING"
        );

        console.log(
            ` http://localhost:${PORT}`
        );

        console.log(
            "================================="
        );

        console.log("");

    }
);