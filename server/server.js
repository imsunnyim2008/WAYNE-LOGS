const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const morgan = require("morgan");
const mongoose = require("mongoose");

dotenv.config();

const authRoutes =
    require("./routes/authRoutes");

const productRoutes =
    require("./routes/productRoutes");

const orderRoutes =
    require("./routes/orderRoutes");

const {
    protect
} = require("./middleware/authMiddleware");

const {
    handlePaystackWebhook
} = require("./controllers/ordercontroller");


const app = express();


// ==========================================
// CORS
// ==========================================

app.use(
    cors()
);


// ==========================================
// PAYSTACK WEBHOOK
//
// IMPORTANT:
// This MUST stay BEFORE express.json().
// Paystack signature verification uses
// the original webhook request body.
// ==========================================

app.post(
    "/api/paystack/webhook",

    express.raw({
        type: "application/json",
        limit: "2mb"
    }),

    handlePaystackWebhook
);


// ==========================================
// NORMAL BODY PARSERS
// ==========================================

app.use(
    express.json({
        limit: "10mb"
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "10mb"
    })
);


// ==========================================
// LOGGING
// ==========================================

app.use(
    morgan("dev")
);


// ==========================================
// API ROUTES
// ==========================================

app.use(
    "/api/auth",
    authRoutes
);

app.use(
    "/api/products",
    productRoutes
);

app.use(
    "/api/orders",
    orderRoutes
);


// ==========================================
// MONGODB
// ==========================================

mongoose
    .connect(
        process.env.MONGO_URI
    )
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


// ==========================================
// API HOME
// ==========================================

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


// ==========================================
// SERVER TEST
// ==========================================

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


// ==========================================
// PROTECTED USER TEST
// ==========================================

app.get(
    "/api/protected",
    protect,
    (req, res) => {

        res.json({
            success: true,
            message:
                "Protected route is working",
            user:
                req.user
        });

    }
);


// ==========================================
// UNKNOWN API ROUTES
// ==========================================

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


// ==========================================
// SERVER
// ==========================================

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