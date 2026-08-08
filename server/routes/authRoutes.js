const express = require("express");

const {
    registerUser,
    loginUser,
    updateProfile
} = require("../controllers/authController");

const {
    protect,
    adminOnly
} = require("../middleware/authMiddleware");

const router = express.Router();


// REGISTER
router.post(
    "/register",
    registerUser
);


// LOGIN
router.post(
    "/login",
    loginUser
);


// CURRENT LOGGED-IN USER
router.get(
    "/me",
    protect,
    (req, res) => {

        res.json({
            success: true,
            user: req.user
        });

    }
);


// UPDATE PROFILE
router.put(
    "/profile",
    protect,
    updateProfile
);


// CHECK ADMIN ACCESS
router.get(
    "/admin",
    protect,
    adminOnly,
    (req, res) => {

        res.json({
            success: true,
            message: "Admin access granted.",
            user: req.user
        });

    }
);


module.exports = router;