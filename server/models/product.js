const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            default: "",
            trim: true
        },

        category: {
            type: String,
            required: true,
            trim: true
        },

        platform: {
            type: String,
            default: "",
            trim: true
        },

        price: {
            type: Number,
            required: true,
            min: 0
        },

        currency: {
            type: String,
            default: "NGN"
        },

        stock: {
            type: Number,
            default: 0,
            min: 0
        },

        imageUrl: {
            type: String,
            default: ""
        },

        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active"
        },

        deliveryType: {
            type: String,
            enum: ["manual", "instant"],
            default: "manual"
        },

        isFeatured: {
            type: Boolean,
            default: false
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "Product",
    productSchema
);