const express = require("express");

const {
    createOrder,
    initializePaystackPayment,
    verifyPaystackPayment,
    getMyOrders,
    getMyOrderById,
    adminGetOrders,
    adminUpdateOrderStatus,
    adminConfirmPayment
} = require("../controllers/ordercontroller");

const {
    protect,
    adminOnly
} = require("../middleware/authMiddleware");

const router = express.Router();


// ==========================================
// CUSTOMER - CREATE ORDER
// ==========================================
router.post(
    "/",
    protect,
    createOrder
);


// ==========================================
// CUSTOMER - MY ORDERS
// ==========================================
router.get(
    "/my",
    protect,
    getMyOrders
);


// ==========================================
// CUSTOMER - START PAYSTACK PAYMENT
// ==========================================
router.post(
    "/:id/paystack/initialize",
    protect,
    initializePaystackPayment
);


// ==========================================
// CUSTOMER - VERIFY PAYSTACK PAYMENT
// ==========================================
router.post(
    "/:id/paystack/verify",
    protect,
    verifyPaystackPayment
);


// ==========================================
// ADMIN - GET ALL ORDERS
// ==========================================
router.get(
    "/admin/all",
    protect,
    adminOnly,
    adminGetOrders
);


// ==========================================
// ADMIN - UPDATE ORDER STATUS
// ==========================================
router.patch(
    "/admin/:id/status",
    protect,
    adminOnly,
    adminUpdateOrderStatus
);


// ==========================================
// OLD MANUAL PAYMENT ROUTE
// Currently disabled by controller.
// ==========================================
router.patch(
    "/admin/:id/confirm-payment",
    protect,
    adminOnly,
    adminConfirmPayment
);


// ==========================================
// CUSTOMER - GET ONE ORDER
// KEEP THIS LAST
// ==========================================
router.get(
    "/:id",
    protect,
    getMyOrderById
);


module.exports = router;