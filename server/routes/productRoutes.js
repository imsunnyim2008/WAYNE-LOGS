const express = require("express");

const {
    getProducts,
    getProductById,
    adminGetProducts,
    createProduct,
    updateProduct,
    deleteProduct
} = require("../controllers/productcontroller");

const {
    protect,
    adminOnly
} = require("../middleware/authMiddleware");


const router = express.Router();


// PUBLIC - GET ACTIVE PRODUCTS
router.get(
    "/",
    getProducts
);


// ADMIN - GET ALL PRODUCTS
router.get(
    "/admin/all",
    protect,
    adminOnly,
    adminGetProducts
);


// ADMIN - CREATE PRODUCT
router.post(
    "/",
    protect,
    adminOnly,
    createProduct
);


// ADMIN - UPDATE PRODUCT
router.put(
    "/:id",
    protect,
    adminOnly,
    updateProduct
);


// ADMIN - DELETE PRODUCT
router.delete(
    "/:id",
    protect,
    adminOnly,
    deleteProduct
);


// PUBLIC - GET ONE PRODUCT
// KEEP THIS LAST
router.get(
    "/:id",
    getProductById
);


module.exports = router;