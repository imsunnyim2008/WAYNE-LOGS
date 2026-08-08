const mongoose = require("mongoose");

const Order = require("../models/order");
const Product = require("../models/product");


// ==========================================
// CUSTOMER - CREATE ORDER
// Price is ALWAYS taken from MongoDB.
// Customer cannot choose their own price.
// ==========================================
exports.createOrder = async (req, res) => {
    try {

        const {
            productId,
            quantity
        } = req.body;


        if (
            !productId ||
            !mongoose.isValidObjectId(productId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid product."
            });
        }


        const orderQuantity =
            Number(quantity || 1);


        if (
            !Number.isInteger(orderQuantity) ||
            orderQuantity < 1
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid quantity."
            });
        }


        const product =
            await Product.findById(productId);


        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }


        if (product.status !== "active") {
            return res.status(400).json({
                success: false,
                message:
                    "This product is currently unavailable."
            });
        }


        if (product.stock < orderQuantity) {
            return res.status(400).json({
                success: false,
                message:
                    "Not enough stock is available."
            });
        }


        const totalAmount =
            product.price *
            orderQuantity;


        const order =
            await Order.create({
                user:
                    req.user._id,

                product:
                    product._id,

                productName:
                    product.name,

                productImage:
                    product.imageUrl || "",

                platform:
                    product.platform || "",

                quantity:
                    orderQuantity,

                unitPrice:
                    product.price,

                totalAmount,

                currency:
                    product.currency || "NGN",

                status:
                    "pending",

                paymentStatus:
                    "pending",

                paymentMethod:
                    "paystack"
            });


        return res.status(201).json({
            success: true,
            message: "Order created successfully.",
            order
        });


    } catch (error) {

        console.error(
            "CREATE ORDER ERROR:",
            error
        );


        return res.status(500).json({
            success: false,
            message:
                "Could not create order."
        });

    }
};


// ==========================================
// CUSTOMER - GET MY ORDERS
// Private delivery is NOT included here.
// ==========================================
exports.getMyOrders = async (req, res) => {
    try {

        const orders =
            await Order
                .find({
                    user: req.user._id
                })
                .sort({
                    createdAt: -1
                });


        return res.json({
            success: true,
            count: orders.length,
            orders
        });


    } catch (error) {

        console.error(
            "GET MY ORDERS ERROR:",
            error
        );


        return res.status(500).json({
            success: false,
            message:
                "Could not load your orders."
        });

    }
};


// ==========================================
// CUSTOMER - GET ONE OF MY ORDERS
//
// deliveryContent is revealed ONLY when:
// paymentStatus === paid
// AND status === completed
// ==========================================
exports.getMyOrderById = async (req, res) => {
    try {

        const { id } =
            req.params;


        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid order ID."
            });
        }


        const order =
            await Order
                .findOne({
                    _id: id,
                    user: req.user._id
                })
                .select(
                    "+deliveryContent"
                );


        if (!order) {
            return res.status(404).json({
                success: false,
                message:
                    "Order not found."
            });
        }


        const result =
            order.toObject();


        if (
            order.paymentStatus !== "paid" ||
            order.status !== "completed"
        ) {
            delete result.deliveryContent;
        }


        return res.json({
            success: true,
            order: result
        });


    } catch (error) {

        console.error(
            "GET ORDER ERROR:",
            error
        );


        return res.status(500).json({
            success: false,
            message:
                "Could not load order."
        });

    }
};


// ==========================================
// ADMIN - GET ALL ORDERS
// ==========================================
exports.adminGetOrders = async (req, res) => {
    try {

        const orders =
            await Order
                .find()
                .populate(
                    "user",
                    "firstName lastName email phone"
                )
                .sort({
                    createdAt: -1
                });


        return res.json({
            success: true,
            count: orders.length,
            orders
        });


    } catch (error) {

        console.error(
            "ADMIN GET ORDERS ERROR:",
            error
        );


        return res.status(500).json({
            success: false,
            message:
                "Could not load orders."
        });

    }
};


// ==========================================
// ADMIN - UPDATE ORDER STATUS
//
// This DOES NOT mark an unpaid order as paid.
// ==========================================
exports.adminUpdateOrderStatus = async (
    req,
    res
) => {
    try {

        const { id } =
            req.params;

        const { status } =
            req.body;


        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid order ID."
            });
        }


        const allowedStatuses = [
            "pending",
            "processing",
            "completed",
            "cancelled",
            "refunded"
        ];


        if (
            !allowedStatuses.includes(
                status
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid order status."
            });
        }


        const order =
            await Order.findById(id);


        if (!order) {
            return res.status(404).json({
                success: false,
                message:
                    "Order not found."
            });
        }


        /*
         * Do not let an unpaid order become
         * completed and accidentally unlock
         * private delivery.
         */
        if (
            status === "completed" &&
            order.paymentStatus !== "paid"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "An unpaid order cannot be completed."
            });
        }


        order.status =
            status;


        await order.save();


        return res.json({
            success: true,
            message:
                "Order status updated.",
            order
        });


    } catch (error) {

        console.error(
            "UPDATE ORDER STATUS ERROR:",
            error
        );


        return res.status(500).json({
            success: false,
            message:
                "Could not update order."
        });

    }
};


// ==========================================
// ADMIN - CONFIRM PAYMENT
//
// Temporary manual confirmation route.
// Later Paystack verification will perform
// this automatically.
//
// Uses a MongoDB transaction so stock and
// payment/order changes happen together.
// ==========================================
exports.adminConfirmPayment = async (
    req,
    res
) => {

    const session =
        await mongoose.startSession();


    try {

        const { id } =
            req.params;

        const {
            paymentReference
        } = req.body;


        if (!mongoose.isValidObjectId(id)) {

            await session.endSession();

            return res.status(400).json({
                success: false,
                message:
                    "Invalid order ID."
            });
        }


        let finalOrder;


        await session.withTransaction(
            async () => {

                const order =
                    await Order
                        .findById(id)
                        .select(
                            "+deliveryContent"
                        )
                        .session(session);


                if (!order) {
                    throw new Error(
                        "ORDER_NOT_FOUND"
                    );
                }


                /*
                 * Already paid = do nothing.
                 * Prevents stock being deducted twice.
                 */
                if (
                    order.paymentStatus ===
                    "paid"
                ) {

                    finalOrder =
                        order;

                    return;
                }


                const product =
                    await Product
                        .findById(
                            order.product
                        )
                        .select(
                            "+privateDelivery"
                        )
                        .session(session);


                if (!product) {
                    throw new Error(
                        "PRODUCT_NOT_FOUND"
                    );
                }


                if (
                    product.stock <
                    order.quantity
                ) {
                    throw new Error(
                        "OUT_OF_STOCK"
                    );
                }


                /*
                 * Deduct stock only when payment
                 * is actually confirmed.
                 */
                product.stock -=
                    order.quantity;


                await product.save({
                    session
                });


                order.paymentStatus =
                    "paid";


                order.paymentReference =
                    paymentReference || "";


                /*
                 * Instant delivery:
                 * copy the hidden fulfillment data
                 * into the customer's order.
                 */
                if (
                    product.deliveryType ===
                    "instant"
                ) {

                    order.deliveryContent =
                        product.privateDelivery ||
                        "";


                    order.status =
                        "completed";


                    order.deliveredAt =
                        new Date();

                } else {

                    /*
                     * Manual delivery still requires
                     * admin fulfillment later.
                     */
                    order.status =
                        "processing";

                }


                await order.save({
                    session
                });


                finalOrder =
                    order;

            }
        );


        return res.json({
            success: true,
            message:
                "Payment confirmed successfully.",
            order: finalOrder
        });


    } catch (error) {

        console.error(
            "CONFIRM PAYMENT ERROR:",
            error
        );


        if (
            error.message ===
            "ORDER_NOT_FOUND"
        ) {
            return res.status(404).json({
                success: false,
                message:
                    "Order not found."
            });
        }


        if (
            error.message ===
            "PRODUCT_NOT_FOUND"
        ) {
            return res.status(404).json({
                success: false,
                message:
                    "Product not found."
            });
        }


        if (
            error.message ===
            "OUT_OF_STOCK"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "This product is now out of stock."
            });
        }


        return res.status(500).json({
            success: false,
            message:
                "Could not confirm payment."
        });


    } finally {

        await session.endSession();

    }
};