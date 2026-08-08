const express = require("express");

const {
    getProducts,
    getProductById,
    adminGetProducts,
    createProduct,
    updateProduct,
    deleteProduct
} = require("../controllers/productController");

const {
    protect,
    adminOnly
} = require("../middleware/authMiddleware");


const router = express.Router();


// ===============================
// PUBLIC MARKETPLACE
// ===============================

// GET ALL ACTIVE PRODUCTS
router.get(
    "/",
    getProducts
);


// ===============================
// ADMIN PRODUCT MANAGEMENT
// ===============================

// GET ALL PRODUCTS
router.get(
    "/admin/all",
    protect,
    adminOnly,
    adminGetProducts
);


// CREATE PRODUCT
router.post(
    "/",
    protect,
    adminOnly,
    createProduct
);


// UPDATE PRODUCT
router.put(
    "/:id",
    protect,
    adminOnly,
    updateProduct
);


// DELETE PRODUCT
router.delete(
    "/:id",
    protect,
    adminOnly,
    deleteProduct
);


// ===============================
// PUBLIC SINGLE PRODUCT
// Keep this route LAST
// ===============================

router.get(
    "/:id",
    getProductById
);


module.exports = router;