const mongoose = require("mongoose");
const crypto = require("crypto");

const Order = require("../models/order");
const Product = require("../models/product");


const PAYSTACK_BASE_URL =
    "https://api.paystack.co";


// ==========================================
// PAYSTACK REQUEST HELPER
// ==========================================
async function paystackRequest(
    path,
    options = {}
) {

    if (!process.env.PAYSTACK_SECRET_KEY) {
        throw new Error(
            "PAYSTACK_KEY_MISSING"
        );
    }


    const response =
        await fetch(
            PAYSTACK_BASE_URL + path,
            {
                ...options,

                headers: {
                    Authorization:
                        "Bearer " +
                        process.env.PAYSTACK_SECRET_KEY,

                    "Content-Type":
                        "application/json",

                    ...(options.headers || {})
                }
            }
        );


    const data =
        await response.json();


    if (
        !response.ok ||
        data.status !== true
    ) {

        const error =
            new Error(
                data.message ||
                "Paystack request failed."
            );

        error.code =
            "PAYSTACK_ERROR";

        throw error;
    }


    return data;
}


// ==========================================
// READ PAYSTACK METADATA
// ==========================================
function parseMetadata(value) {

    if (!value) {
        return {};
    }


    if (
        typeof value === "object"
    ) {
        return value;
    }


    try {

        return JSON.parse(value);

    } catch (error) {

        return {};

    }
}


// ==========================================
// FINALIZE VERIFIED PAYMENT
// ==========================================
async function finalizePaidOrder(
    orderId,
    paymentReference
) {

    const session =
        await mongoose.startSession();


    let finalOrder;


    try {

        await session.withTransaction(
            async () => {

                const order =
                    await Order
                        .findById(orderId)
                        .select(
                            "+deliveryContent"
                        )
                        .session(session);


                if (!order) {

                    throw new Error(
                        "ORDER_NOT_FOUND"
                    );

                }


                // Already paid.
                // Never deduct stock twice.
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
                        .findOneAndUpdate(
                            {
                                _id:
                                    order.product,

                                status:
                                    "active",

                                stock: {
                                    $gte:
                                        order.quantity
                                }
                            },

                            {
                                $inc: {
                                    stock:
                                        -order.quantity
                                }
                            },

                            {
                                new: true,
                                session
                            }
                        )
                        .select(
                            "+privateDelivery"
                        );


                if (!product) {

                    throw new Error(
                        "OUT_OF_STOCK"
                    );

                }


                order.paymentStatus =
                    "paid";


                order.paymentMethod =
                    "paystack";


                order.paymentReference =
                    paymentReference;


                // ==================================
                // INSTANT DELIVERY
                // ==================================

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

                    // Manual delivery
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


        return finalOrder;


    } finally {

        await session.endSession();

    }
}


// ==========================================
// CUSTOMER - CREATE ORDER
// ==========================================
exports.createOrder =
async (req, res) => {

    try {

        const {
            productId,
            quantity
        } = req.body;


        if (
            !productId ||
            !mongoose.isValidObjectId(
                productId
            )
        ) {

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "Invalid product."
                });

        }


        const orderQuantity =
            Number(quantity || 1);


        if (
            !Number.isInteger(
                orderQuantity
            ) ||
            orderQuantity < 1
        ) {

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "Invalid quantity."
                });

        }


        const product =
            await Product.findById(
                productId
            );


        if (!product) {

            return res
                .status(404)
                .json({
                    success: false,
                    message:
                        "Product not found."
                });

        }


        if (
            product.status !==
            "active"
        ) {

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "This product is currently unavailable."
                });

        }


        if (
            product.stock <
            orderQuantity
        ) {

            return res
                .status(400)
                .json({
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
                    product.imageUrl ||
                    "",

                platform:
                    product.platform ||
                    "",

                quantity:
                    orderQuantity,

                unitPrice:
                    product.price,

                totalAmount,

                currency:
                    product.currency ||
                    "NGN",

                status:
                    "pending",

                paymentStatus:
                    "pending",

                paymentMethod:
                    "paystack"

            });


        return res
            .status(201)
            .json({

                success: true,

                message:
                    "Order created successfully.",

                order

            });


    } catch (error) {

        console.error(
            "CREATE ORDER ERROR:",
            error.message
        );


        return res
            .status(500)
            .json({

                success: false,

                message:
                    "Could not create order."

            });

    }

};


// ==========================================
// CUSTOMER - INITIALIZE PAYSTACK PAYMENT
// ==========================================
exports.initializePaystackPayment =
async (req, res) => {

    try {

        const { id } =
            req.params;


        if (
            !mongoose.isValidObjectId(id)
        ) {

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "Invalid order ID."
                });

        }


        const order =
            await Order.findOne({

                _id:
                    id,

                user:
                    req.user._id

            });


        if (!order) {

            return res
                .status(404)
                .json({
                    success: false,
                    message:
                        "Order not found."
                });

        }


        if (
            order.paymentStatus ===
            "paid"
        ) {

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "This order has already been paid."
                });

        }


        if (
            order.status ===
            "cancelled"
        ) {

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "This order has been cancelled."
                });

        }


        const product =
            await Product.findOne({

                _id:
                    order.product,

                status:
                    "active"

            });


        if (!product) {

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "This product is no longer available."
                });

        }


        if (
            product.stock <
            order.quantity
        ) {

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "This product is currently out of stock."
                });

        }


        // NGN -> KOBO
        const amountInKobo =
            Math.round(
                Number(
                    order.totalAmount
                ) * 100
            );


        if (
            !Number.isInteger(
                amountInKobo
            ) ||
            amountInKobo < 1
        ) {

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "Invalid payment amount."
                });

        }


        // Unique reference
        const reference =
            "WL" +
            order._id.toString() +
            Date.now().toString();


        const frontendUrl =
            (
                process.env.FRONTEND_URL ||
                "https://client-livid-one-87.vercel.app"
            )
            .replace(
                /\/$/,
                ""
            );


        const callbackUrl =
            frontendUrl +
            "/orders.html" +
            "?order=" +
            encodeURIComponent(
                order._id.toString()
            ) +
            "&payment=callback";


        const result =
            await paystackRequest(
                "/transaction/initialize",
                {

                    method:
                        "POST",

                    body:
                        JSON.stringify({

                            email:
                                req.user.email,

                            amount:
                                String(
                                    amountInKobo
                                ),

                            currency:
                                order.currency ||
                                "NGN",

                            reference,

                            callback_url:
                                callbackUrl,

                            metadata:
                                JSON.stringify({

                                    orderId:
                                        order._id.toString(),

                                    userId:
                                        req.user._id.toString(),

                                    productId:
                                        order.product.toString()

                                })

                        })

                }
            );


        order.paymentReference =
            result.data.reference;


        order.paymentMethod =
            "paystack";


        await order.save();


        return res.json({

            success: true,

            message:
                "Payment initialized.",

            authorizationUrl:
                result.data.authorization_url,

            accessCode:
                result.data.access_code,

            reference:
                result.data.reference

        });


    } catch (error) {

        console.error(
            "PAYSTACK INITIALIZE ERROR:",
            error.message
        );


        if (
            error.message ===
            "PAYSTACK_KEY_MISSING"
        ) {

            return res
                .status(500)
                .json({
                    success: false,
                    message:
                        "Payment configuration is missing."
                });

        }


        return res
            .status(500)
            .json({

                success: false,

                message:
                    error.code ===
                    "PAYSTACK_ERROR"
                        ?
                        error.message
                        :
                        "Could not initialize payment."

            });

    }

};


// ==========================================
// CUSTOMER - VERIFY PAYSTACK PAYMENT
// ==========================================
exports.verifyPaystackPayment =
async (req, res) => {

    try {

        const { id } =
            req.params;


        const {
            reference
        } = req.body;


        if (
            !mongoose.isValidObjectId(id)
        ) {

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "Invalid order ID."
                });

        }


        if (
            !reference ||
            typeof reference !==
            "string"
        ) {

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "Payment reference is required."
                });

        }


        const order =
            await Order.findOne({

                _id:
                    id,

                user:
                    req.user._id

            });


        if (!order) {

            return res
                .status(404)
                .json({
                    success: false,
                    message:
                        "Order not found."
                });

        }


        // Already verified
        if (
            order.paymentStatus ===
            "paid"
        ) {

            const paidOrder =
                await Order
                    .findById(
                        order._id
                    )
                    .select(
                        "+deliveryContent"
                    );


            return res.json({

                success: true,

                message:
                    "Payment was already verified.",

                order:
                    paidOrder

            });

        }


        // Make sure callback reference
        // matches our initialized payment.
        if (
            order.paymentReference &&
            order.paymentReference !==
            reference
        ) {

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "Payment reference mismatch."
                });

        }


        const result =
            await paystackRequest(
                "/transaction/verify/" +
                encodeURIComponent(
                    reference
                ),
                {
                    method:
                        "GET"
                }
            );


        const transaction =
            result.data;


        if (
            transaction.status !==
            "success"
        ) {

            return res
                .status(400)
                .json({

                    success: false,

                    message:
                        "Payment has not been completed.",

                    paymentStatus:
                        transaction.status

                });

        }


        if (
            transaction.reference !==
            reference
        ) {

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "Payment reference mismatch."
                });

        }


        const metadata =
            parseMetadata(
                transaction.metadata
            );


        if (
            String(
                metadata.orderId ||
                ""
            ) !==
            order._id.toString()
        ) {

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "Payment does not belong to this order."
                });

        }


        if (
            String(
                metadata.userId ||
                ""
            ) !==
            req.user._id.toString()
        ) {

            return res
                .status(403)
                .json({
                    success: false,
                    message:
                        "Payment account mismatch."
                });

        }


        const expectedAmount =
            Math.round(
                Number(
                    order.totalAmount
                ) * 100
            );


        if (
            Number(
                transaction.amount
            ) !==
            expectedAmount
        ) {

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "Payment amount mismatch."
                });

        }


        if (
            String(
                transaction.currency ||
                ""
            ).toUpperCase()
            !==
            String(
                order.currency ||
                "NGN"
            ).toUpperCase()
        ) {

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "Payment currency mismatch."
                });

        }


        const finalOrder =
            await finalizePaidOrder(
                order._id,
                transaction.reference
            );


        return res.json({

            success: true,

            message:
                finalOrder.status ===
                "completed"
                    ?
                    "Payment verified and order delivered."
                    :
                    "Payment verified successfully.",

            order:
                finalOrder

        });


    } catch (error) {

        console.error(
            "PAYSTACK VERIFY ERROR:",
            error.message
        );


        if (
            error.message ===
            "OUT_OF_STOCK"
        ) {

            return res
                .status(409)
                .json({
                    success: false,
                    message:
                        "Payment was received, but the product became unavailable. Contact support."
                });

        }


        if (
            error.message ===
            "ORDER_NOT_FOUND"
        ) {

            return res
                .status(404)
                .json({
                    success: false,
                    message:
                        "Order not found."
                });

        }


        if (
            error.message ===
            "PAYSTACK_KEY_MISSING"
        ) {

            return res
                .status(500)
                .json({
                    success: false,
                    message:
                        "Payment configuration is missing."
                });

        }


        return res
            .status(500)
            .json({

                success: false,

                message:
                    error.code ===
                    "PAYSTACK_ERROR"
                        ?
                        error.message
                        :
                        "Could not verify payment."

            });

    }

};


// ==========================================
// CUSTOMER - GET MY ORDERS
// ==========================================
exports.getMyOrders =
async (req, res) => {

    try {

        const orders =
            await Order
                .find({
                    user:
                        req.user._id
                })
                .sort({
                    createdAt:
                        -1
                });


        return res.json({

            success: true,

            count:
                orders.length,

            orders

        });


    } catch (error) {

        console.error(
            "GET MY ORDERS ERROR:",
            error.message
        );


        return res
            .status(500)
            .json({

                success: false,

                message:
                    "Could not load your orders."

            });

    }

};


// ==========================================
// CUSTOMER - GET ONE ORDER
// ==========================================
exports.getMyOrderById =
async (req, res) => {

    try {

        const { id } =
            req.params;


        if (
            !mongoose.isValidObjectId(id)
        ) {

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "Invalid order ID."
                });

        }


        const order =
            await Order
                .findOne({

                    _id:
                        id,

                    user:
                        req.user._id

                })
                .select(
                    "+deliveryContent"
                );


        if (!order) {

            return res
                .status(404)
                .json({
                    success: false,
                    message:
                        "Order not found."
                });

        }


        const result =
            order.toObject();


        if (
            order.paymentStatus !==
            "paid" ||
            order.status !==
            "completed"
        ) {

            delete result.deliveryContent;

        }


        return res.json({

            success: true,

            order:
                result

        });


    } catch (error) {

        console.error(
            "GET ORDER ERROR:",
            error.message
        );


        return res
            .status(500)
            .json({

                success: false,

                message:
                    "Could not load order."

            });

    }

};


// ==========================================
// ADMIN - GET ALL ORDERS
// ==========================================
exports.adminGetOrders =
async (req, res) => {

    try {

        const orders =
            await Order
                .find()
                .populate(
                    "user",
                    "firstName lastName email phone"
                )
                .sort({
                    createdAt:
                        -1
                });


        return res.json({

            success: true,

            count:
                orders.length,

            orders

        });


    } catch (error) {

        console.error(
            "ADMIN GET ORDERS ERROR:",
            error.message
        );


        return res
            .status(500)
            .json({

                success: false,

                message:
                    "Could not load orders."

            });

    }

};


// ==========================================
// ADMIN - UPDATE ORDER STATUS
// ==========================================
exports.adminUpdateOrderStatus =
async (req, res) => {

    try {

        const { id } =
            req.params;


        const {
            status
        } = req.body;


        if (
            !mongoose.isValidObjectId(id)
        ) {

            return res
                .status(400)
                .json({
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

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "Invalid order status."
                });

        }


        const order =
            await Order.findById(
                id
            );


        if (!order) {

            return res
                .status(404)
                .json({
                    success: false,
                    message:
                        "Order not found."
                });

        }


        if (
            status ===
            "completed" &&
            order.paymentStatus !==
            "paid"
        ) {

            return res
                .status(400)
                .json({
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
            error.message
        );


        return res
            .status(500)
            .json({

                success: false,

                message:
                    "Could not update order."

            });

    }

};


// ==========================================
// MANUAL PAYMENT CONFIRMATION DISABLED
// ==========================================
exports.adminConfirmPayment =
async (req, res) => {

    return res
        .status(403)
        .json({

            success: false,

            message:
                "Manual payment confirmation is disabled. Verify payment through Paystack."

        });

};


// ==========================================
// PAYSTACK WEBHOOK
// ==========================================
exports.handlePaystackWebhook =
async (req, res) => {

    try {

        const secret =
            process.env.PAYSTACK_SECRET_KEY;


        if (!secret) {

            console.error(
                "PAYSTACK WEBHOOK ERROR: Secret key missing."
            );

            return res.sendStatus(500);

        }


        const signature =
            req.headers[
                "x-paystack-signature"
            ];


        if (
            !signature ||
            !Buffer.isBuffer(req.body)
        ) {

            return res.sendStatus(400);

        }


        // ==================================
        // VERIFY PAYSTACK SIGNATURE
        // ==================================

        const calculatedSignature =
            crypto
                .createHmac(
                    "sha512",
                    secret
                )
                .update(req.body)
                .digest("hex");


        const calculatedBuffer =
            Buffer.from(
                calculatedSignature,
                "utf8"
            );


        const receivedBuffer =
            Buffer.from(
                String(signature)
                    .trim()
                    .toLowerCase(),
                "utf8"
            );


        if (
            calculatedBuffer.length !==
            receivedBuffer.length
        ) {

            return res.sendStatus(401);

        }


        const validSignature =
            crypto.timingSafeEqual(
                calculatedBuffer,
                receivedBuffer
            );


        if (!validSignature) {

            return res.sendStatus(401);

        }


        // ==================================
        // PARSE EVENT
        // ==================================

        let event;


        try {

            event =
                JSON.parse(
                    req.body.toString(
                        "utf8"
                    )
                );

        } catch (error) {

            return res.sendStatus(400);

        }


        // ==================================
        // ONLY CHARGE.SUCCESS
        // ==================================

        if (
            event.event !==
            "charge.success"
        ) {

            return res.sendStatus(200);

        }


        const transaction =
            event.data || {};


        if (
            transaction.status !==
            "success" ||
            !transaction.reference
        ) {

            return res.sendStatus(200);

        }


        const metadata =
            parseMetadata(
                transaction.metadata
            );


        // ==================================
        // FIND ORDER
        // ==================================

        let order = null;


        if (
            metadata.orderId &&
            mongoose.isValidObjectId(
                metadata.orderId
            )
        ) {

            order =
                await Order.findById(
                    metadata.orderId
                );

        }


        if (!order) {

            order =
                await Order.findOne({

                    paymentReference:
                        transaction.reference

                });

        }


        if (!order) {

            return res
                .status(200)
                .json({

                    success: true,

                    message:
                        "Webhook received."

                });

        }


        // ==================================
        // ALREADY PAID
        // ==================================

        if (
            order.paymentStatus ===
            "paid"
        ) {

            return res.sendStatus(200);

        }


        // ==================================
        // VERIFY REFERENCE
        // ==================================

        if (
            order.paymentReference &&
            order.paymentReference !==
            transaction.reference
        ) {

            return res.sendStatus(200);

        }


        // ==================================
        // VERIFY USER
        // ==================================

        if (
            metadata.userId &&
            String(
                metadata.userId
            ) !==
            order.user.toString()
        ) {

            return res.sendStatus(200);

        }


        // ==================================
        // VERIFY ORDER ID
        // ==================================

        if (
            metadata.orderId &&
            String(
                metadata.orderId
            ) !==
            order._id.toString()
        ) {

            return res.sendStatus(200);

        }


        // ==================================
        // VERIFY AMOUNT
        // ==================================

        const expectedAmount =
            Math.round(
                Number(
                    order.totalAmount
                ) * 100
            );


        if (
            Number(
                transaction.amount
            ) !==
            expectedAmount
        ) {

            console.error(
                "PAYSTACK WEBHOOK: Amount mismatch."
            );

            return res.sendStatus(200);

        }


        // ==================================
        // VERIFY CURRENCY
        // ==================================

        const expectedCurrency =
            String(
                order.currency ||
                "NGN"
            ).toUpperCase();


        const paidCurrency =
            String(
                transaction.currency ||
                ""
            ).toUpperCase();


        if (
            expectedCurrency !==
            paidCurrency
        ) {

            console.error(
                "PAYSTACK WEBHOOK: Currency mismatch."
            );

            return res.sendStatus(200);

        }


        // ==================================
        // FINALIZE PAYMENT
        // ==================================

        await finalizePaidOrder(
            order._id,
            transaction.reference
        );


        return res.sendStatus(200);


    } catch (error) {

        console.error(
            "PAYSTACK WEBHOOK ERROR:",
            error.message
        );


        return res.sendStatus(500);

    }

};