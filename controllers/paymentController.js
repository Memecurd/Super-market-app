/**
 * Payment Controller (controllers/paymentController.js)
 * 
 * Handles PayPal and NETS QR payment flows.
 * Uses Transaction model for idempotency and Product model for price verification.
 */

const paypal = require('@paypal/checkout-server-sdk');
const axios = require('axios');
const qrcode = require('qrcode');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const productController = require('./productController');

// ===========================================
// PAYPAL CONFIGURATION
// ===========================================
function getPayPalClient() {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const environment = process.env.PAYPAL_ENVIRONMENT === 'Sandbox'
        ? new paypal.core.SandboxEnvironment(clientId, clientSecret)
        : new paypal.core.LiveEnvironment(clientId, clientSecret);

    return new paypal.core.PayPalHttpClient(environment);
}

const paymentController = {

    /**
     * Helper: Calculate total from DB to prevent tampering
     * @param {Array} cart 
     * @returns {Promise<number>} Total amount
     */
    calculateServerTotal: async (cart) => {
        let total = 0;
        for (const item of cart) {
            const product = await Product.getById(item.productId);
            if (product) {
                total += parseFloat(product.price) * parseInt(item.quantity);
            }
        }
        return parseFloat(total.toFixed(2));
    },

    // ===========================================
    // PAYPAL FLOW
    // ===========================================

    /**
     * POST /api/paypal/create-order
     * Create Order Intent
     */
    createPayPalOrder: async (req, res) => {
        try {
            const user = req.session.user;
            if (!user) return res.status(401).json({ error: 'Unauthorized' });

            const cart = req.session.cart || [];
            if (cart.length === 0) {
                return res.status(400).json({ error: 'Cart is empty' });
            }

            const total = await paymentController.calculateServerTotal(cart);

            const request = new paypal.orders.OrdersCreateRequest();
            request.prefer("return=representation");
            request.requestBody({
                intent: 'CAPTURE',
                purchase_units: [{
                    amount: {
                        currency_code: 'SGD',
                        value: total.toString()
                    }
                }]
            });

            const client = getPayPalClient();
            const order = await client.execute(request);
            const orderID = order.result.id;

            // Create Transaction Record (PENDING)
            await Transaction.create({
                txn_ref: orderID, // For PayPal, we use OrderID as our reference initially
                provider_ref: orderID,
                user_id: user.id,
                provider: 'PAYPAL',
                amount: total,
                status: 'PENDING'
            });

            res.json({ id: orderID });

        } catch (error) {
            console.error('PayPal Create Order Error:', error);
            res.status(500).json({ error: 'Failed to create PayPal order' });
        }
    },

    /**
     * POST /api/paypal/capture-order
     * Capture Funds & Finalize
     */
    capturePayPalOrder: async (req, res) => {
        try {
            const { orderID } = req.body;

            // 1. Idempotency Check
            const transaction = await Transaction.findByRef(orderID);
            if (!transaction) return res.status(404).json({ error: 'Transaction not found' });

            if (transaction.status === 'PAID') {
                return res.status(400).json({ error: 'Order already processed' });
            }

            // 2. Capture Payment
            const request = new paypal.orders.OrdersCaptureRequest(orderID);
            request.requestBody({});

            const client = getPayPalClient();
            const capture = await client.execute(request);

            // 3. Verify Success
            if (capture.result.status === 'COMPLETED') {
                // Update Transaction
                await Transaction.updateStatus(orderID, 'PAID');

                // Finalize Order (Clear Cart, Update Stock)
                const cart = req.session.cart || [];
                // Pass transaction.id internal ID
                await productController.finalizeOrder(req, cart, transaction.id);

                res.json({ status: 'COMPLETED' });
            } else {
                await Transaction.updateStatus(orderID, 'FAILED');
                res.status(500).json({ error: 'Payment capture failed' });
            }

        } catch (error) {
            console.error('PayPal Capture Error:', error);
            res.status(500).json({ error: 'Failed to capture payment' });
        }
    },

    // ===========================================
    // NETS QR FLOW
    // ===========================================

    /**
     * POST /api/nets/qr
     * Generate NETS QR
     */
    generateNetsQr: async (req, res) => {
        try {
            const user = req.session.user;
            if (!user) return res.status(401).json({ error: 'Unauthorized' });

            const cart = req.session.cart || [];
            if (cart.length === 0) {
                return res.status(400).json({ error: 'Cart is empty' });
            }

            const total = await paymentController.calculateServerTotal(cart);
            const txnRef = `NETS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const netsProviderRef = process.env.NETS_TXN_ID; // Use Sandbox Txn ID as provider ref foundation or just store it

            // Create Transaction Record (PENDING)
            await Transaction.create({
                txn_ref: txnRef,
                provider_ref: netsProviderRef,
                user_id: user.id,
                provider: 'NETS',
                amount: total,
                status: 'PENDING'
            });

            // Call NETS Sandbox API (Simulated)
            const netsQrString = `NETS_QR_DATA_${txnRef}_AMT_${total}_REF_${netsProviderRef}`;

            // Generate QR Image as Data URL
            const qrDataUrl = await qrcode.toDataURL(netsQrString);

            res.json({
                qrImage: qrDataUrl,
                txnRef: txnRef,
                amount: total
            });

        } catch (error) {
            console.error('NETS QR Gen Error:', error);
            res.status(500).json({ error: 'Failed to generate NETS QR' });
        }
    },

    /**
     * GET /sse/payment-status/:txnRef
     * Server-Sent Events for Status Polling
     */
    paymentStatusSSE: async (req, res) => {
        const { txnRef } = req.params;
        const user = req.session.user;

        // Security Check: Ensure user is logged in
        if (!user) {
            res.status(401).end();
            return;
        }

        // Fetch transaction to verify ownership
        const transaction = await Transaction.findByRef(txnRef);
        if (!transaction || transaction.user_id !== user.id) {
            res.status(403).end(); // Forbidden
            return;
        }

        // SSE Headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });

        res.write(`data: ${JSON.stringify({ status: 'CONNECTED' })}\n\n`);

        const startTime = Date.now();
        const TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

        const intervalId = setInterval(async () => {
            try {
                // Check if client disconnected
                if (res.writableEnded) {
                    clearInterval(intervalId);
                    return;
                }

                // Check Timeout
                if (Date.now() - startTime > TIMEOUT_MS) {
                    res.write(`data: ${JSON.stringify({ status: 'TIMEOUT' })}\n\n`);
                    await Transaction.updateStatus(txnRef, 'TIMEOUT');
                    clearInterval(intervalId);
                    res.end(); // Close connection
                    return;
                }

                // Poll Status
                const freshTxn = await Transaction.findByRef(txnRef);

                if (freshTxn.status === 'PAID') {
                    res.write(`data: ${JSON.stringify({ status: 'SUCCESS' })}\n\n`);
                    clearInterval(intervalId);

                    // Finalize order if not already (Double check logic)
                    const cart = req.session.cart || [];
                    if (cart.length > 0) {
                        await productController.finalizeOrder(req, cart, freshTxn.id);
                    }
                    res.end(); // Close connection
                } else if (freshTxn.status === 'FAILED') {
                    res.write(`data: ${JSON.stringify({ status: 'FAILED' })}\n\n`);
                    clearInterval(intervalId);
                    res.end(); // Close connection
                } else {
                    // Keep alive / Pending
                    res.write(`data: ${JSON.stringify({ status: 'PENDING' })}\n\n`);
                }

            } catch (err) {
                console.error('SSE Error:', err);
                clearInterval(intervalId);
                res.end();
            }
        }, 3000); // Poll every 3 seconds

        // Cleanup on client close
        req.on('close', () => {
            clearInterval(intervalId);
        });
    }
};

module.exports = paymentController;
