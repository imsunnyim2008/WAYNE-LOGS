const express = require("express");

const {
    createOrder,
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


// ===============================
// CUSTOMER - CREATE ORDER
// ===============================
router.post(
    "/",
    protect,
    createOrder
);


// ===============================
// CUSTOMER - MY ORDERS
// ===============================
router.get(
    "/my",
    protect,
    getMyOrders
);


// ===============================
// ADMIN - ALL ORDERS
// ===============================
router.get(
    "/admin/all",
    protect,
    adminOnly,
    adminGetOrders
);


// ===============================
// ADMIN - UPDATE ORDER STATUS
// ===============================
router.patch(
    "/admin/:id/status",
    protect,
    adminOnly,
    adminUpdateOrderStatus
);


// ===============================
// ADMIN - CONFIRM PAYMENT
// Temporary until Paystack verification
// is connected.
// ===============================
router.patch(
    "/admin/:id/confirm-payment",
    protect,
    adminOnly,
    adminConfirmPayment
);


// ===============================
// CUSTOMER - ONE ORDER
// KEEP THIS LAST
// ===============================
router.get(
    "/:id",
    protect,
    getMyOrderById
);


module.exports = router;