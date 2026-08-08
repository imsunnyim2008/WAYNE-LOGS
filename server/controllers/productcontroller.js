const mongoose = require("mongoose");
const Product = require("../models/Product");


// ===============================
// GET ALL ACTIVE PRODUCTS
// PUBLIC MARKETPLACE
// ===============================
exports.getProducts = async (req, res) => {
    try {

        const filter = {
            status: "active"
        };

        if (req.query.category) {
            filter.category = req.query.category;
        }

        if (req.query.platform) {
            filter.platform = req.query.platform;
        }

        const products = await Product
            .find(filter)
            .sort({ createdAt: -1 });

        return res.json({
            success: true,
            count: products.length,
            products
        });

    } catch (error) {

        console.error("GET PRODUCTS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Could not load products."
        });

    }
};


// ===============================
// GET ONE PRODUCT
// ===============================
exports.getProductById = async (req, res) => {
    try {

        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID."
            });
        }

        const product = await Product.findById(id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        return res.json({
            success: true,
            product
        });

    } catch (error) {

        console.error("GET PRODUCT ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Could not load product."
        });

    }
};


// ===============================
// ADMIN - GET EVERY PRODUCT
// ACTIVE + INACTIVE
// ===============================
exports.adminGetProducts = async (req, res) => {
    try {

        const products = await Product
            .find()
            .sort({ createdAt: -1 });

        return res.json({
            success: true,
            count: products.length,
            products
        });

    } catch (error) {

        console.error("ADMIN GET PRODUCTS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Could not load admin products."
        });

    }
};


// ===============================
// ADMIN - CREATE PRODUCT
// ===============================
exports.createProduct = async (req, res) => {
    try {

        const {
            name,
            description,
            category,
            platform,
            price,
            stock,
            imageUrl,
            status,
            deliveryType,
            isFeatured
        } = req.body;


        if (!name || !category || price === undefined) {
            return res.status(400).json({
                success: false,
                message: "Name, category and price are required."
            });
        }


        const numericPrice = Number(price);
        const numericStock = Number(stock || 0);


        if (
            Number.isNaN(numericPrice) ||
            numericPrice < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid product price."
            });
        }


        if (
            Number.isNaN(numericStock) ||
            numericStock < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid stock amount."
            });
        }


        const product = await Product.create({
            name,
            description: description || "",
            category,
            platform: platform || "",
            price: numericPrice,
            stock: numericStock,
            imageUrl: imageUrl || "",
            status: status || "active",
            deliveryType: deliveryType || "manual",
            isFeatured: Boolean(isFeatured),
            createdBy: req.user._id
        });


        return res.status(201).json({
            success: true,
            message: "Product created successfully.",
            product
        });

    } catch (error) {

        console.error("CREATE PRODUCT ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Could not create product."
        });

    }
};


// ===============================
// ADMIN - UPDATE PRODUCT
// ===============================
exports.updateProduct = async (req, res) => {
    try {

        const { id } = req.params;


        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID."
            });
        }


        const product = await Product.findById(id);


        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }


        const allowedFields = [
            "name",
            "description",
            "category",
            "platform",
            "imageUrl",
            "status",
            "deliveryType",
            "isFeatured"
        ];


        allowedFields.forEach((field) => {

            if (req.body[field] !== undefined) {
                product[field] = req.body[field];
            }

        });


        if (req.body.price !== undefined) {

            const price = Number(req.body.price);

            if (
                Number.isNaN(price) ||
                price < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Enter a valid product price."
                });
            }

            product.price = price;
        }


        if (req.body.stock !== undefined) {

            const stock = Number(req.body.stock);

            if (
                Number.isNaN(stock) ||
                stock < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Enter a valid stock amount."
                });
            }

            product.stock = stock;
        }


        await product.save();


        return res.json({
            success: true,
            message: "Product updated successfully.",
            product
        });

    } catch (error) {

        console.error("UPDATE PRODUCT ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Could not update product."
        });

    }
};


// ===============================
// ADMIN - DELETE PRODUCT
// ===============================
exports.deleteProduct = async (req, res) => {
    try {

        const { id } = req.params;


        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID."
            });
        }


        const product = await Product.findById(id);


        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }


        await product.deleteOne();


        return res.json({
            success: true,
            message: "Product deleted successfully."
        });

    } catch (error) {

        console.error("DELETE PRODUCT ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Could not delete product."
        });

    }
};