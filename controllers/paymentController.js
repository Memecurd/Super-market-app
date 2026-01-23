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
        console.log('PayPal: createPayPalOrder initiated');
        try {
            const user = req.session.user;
            if (!user) {
                console.log('PayPal: User not authorized');
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const cart = req.session.cart || [];
            if (cart.length === 0) {
                console.log('PayPal: Cart is empty');
                return res.status(400).json({ error: 'Cart is empty' });
            }

            console.log('PayPal: Calculating server total from DB...');
            const total = await paymentController.calculateServerTotal(cart);
            console.log(`PayPal: Total calculated: ${total}`);

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

            console.log('PayPal: Connecting to PayPal API...');
            const client = getPayPalClient();
            const order = await client.execute(request);
            const orderID = order.result.id;
            console.log(`PayPal: Order created with ID: ${orderID}`);

            // Create Transaction Record (PENDING)
            console.log('PayPal: Creating DB transaction...');
            await Transaction.create({
                txn_ref: orderID, // For PayPal, we use OrderID as our reference initially
                provider_ref: orderID,
                user_id: user.id,
                provider: 'PAYPAL',
                amount: total,
                status: 'PENDING'
            });
            console.log('PayPal: Transaction saved to DB');

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
    /**
     * POST /api/nets/qr
     * Generate NETS QR via Real Sandbox API
     */
    generateNetsQr: async (req, res) => {
        try {
            const user = req.session.user;
            if (!user) return res.status(401).json({ error: 'Unauthorized' });

            const cart = req.session.cart || [];
            if (cart.length === 0) {
                return res.status(400).json({ error: 'Cart is empty' });
            }

            // 1. Calculate Server Total
            const total = await paymentController.calculateServerTotal(cart);

            // 2. Call NETS Request API
            const url = `${process.env.NETS_BASE_URL}/api/v1/common/payments/nets-qr/request`;

            const payload = {
                txn_id: process.env.NETS_TXN_ID, // Terminal ID / Station ID
                amt_in_dollars: total,
                notify_mobile: 0
            };

            const headers = {
                'Content-Type': 'application/json',
                'api-key': process.env.NETS_API_KEY,
                'project-id': process.env.NETS_PROJECT_ID
            };



            let response;
            try {
                response = await axios.post(url, payload, { headers });
            } catch (apiError) {
                console.error('NETS API Request Failed:', apiError.response?.status);

                return res.status(400).json({
                    error: 'NETS QR request failed',
                    details: apiError.response?.data
                });
            }

            let netsBody = response.data;

            // Handle Nested Structure (Sandbox specific or wrapper)
            // Some APIs return { status, result: { data: {...} } }
            // Others return { status, result: {...} }
            // Handle Nested Structure (Sandbox returns result.data)
            if (netsBody.result) {
                netsBody = netsBody.result;
                if (netsBody.data && typeof netsBody.data === 'object') {
                    netsBody = netsBody.data;
                }
            }



            if (netsBody.response_code !== '00') {
                console.error('NETS API Error:', netsBody);
                return res.status(400).json({
                    error: 'NETS QR request failed',
                    details: netsBody
                });
            }

            // 3. Process Response
            const txnRetrievalRef = netsBody.txn_retrieval_ref;
            const qrCodeBase64 = netsBody.qr_code;
            const qrDataUrl = `data:image/png;base64,${qrCodeBase64}`;

            // 4. Create Transaction Record (PENDING)
            // We use txn_retrieval_ref as the unique identifier
            await Transaction.create({
                txn_ref: txnRetrievalRef,
                provider_ref: txnRetrievalRef,
                user_id: user.id,
                provider: 'NETS',
                amount: total,
                status: 'PENDING'
            });



            res.json({
                qrImage: qrDataUrl,
                txnRef: txnRetrievalRef,
                amount: total
            });

        } catch (error) {
            console.error('NETS QR Gen Error:', error.message);
            res.status(500).json({ error: 'Failed to generate NETS QR' });
        }
    },



    /**
     * GET /sse/payment-status/:txnRef
     * Server-Sent Events for Status Polling
     */
    /**
     * GET /sse/payment-status/:txnRef
     * Server-Sent Events for Status Polling with NETS Query
     */
    paymentStatusSSE: async (req, res) => {
        const { txnRef } = req.params;
        const user = req.session.user;

        if (!user) {
            res.status(401).end();
            return;
        }

        const transaction = await Transaction.findByRef(txnRef);
        if (!transaction || transaction.user_id !== user.id) {
            res.status(403).end();
            return;
        }

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
                if (res.writableEnded) {
                    clearInterval(intervalId);
                    return;
                }

                if (Date.now() - startTime > TIMEOUT_MS) {
                    res.write(`data: ${JSON.stringify({ status: 'TIMEOUT' })}\n\n`);
                    await Transaction.updateStatus(txnRef, 'TIMEOUT');
                    clearInterval(intervalId);
                    res.end();
                    return;
                }

                // --- POLL NETS API ---
                const url = `${process.env.NETS_BASE_URL}/api/v1/common/payments/nets-qr/query`;
                const payload = {
                    txn_retrieval_ref: txnRef,
                    frontend_timeout_status: 1
                };
                const headers = {
                    'Content-Type': 'application/json',
                    'api-key': process.env.NETS_API_KEY,
                    'project-id': process.env.NETS_PROJECT_ID
                };

                const response = await axios.post(url, payload, { headers });
                let data = response.data;

                // Handle Nested Structure (same as generateNetsQr)
                if (data.result) {
                    data = data.result;
                    if (data.data && typeof data.data === 'object') {
                        data = data.data;
                    }
                }

                // Check if Paid (00 means Success)
                if (data.response_code === '00') {
                    // Double check internal DB to avoid re-finalizing
                    const freshTxn = await Transaction.findByRef(txnRef);
                    if (freshTxn.status !== 'PAID') {
                        await Transaction.updateStatus(txnRef, 'PAID');
                        const cart = req.session.cart || [];
                        if (cart.length > 0) {
                            await productController.finalizeOrder(req, cart, freshTxn.id);
                        }
                    }

                    res.write(`data: ${JSON.stringify({ status: 'SUCCESS' })}\n\n`);
                    clearInterval(intervalId);
                    res.end();

                } else if (data.response_code !== '09' && data.response_code !== 'Pending') {
                    // Treat everything else as PENDING for now to avoid premature failure
                    res.write(`data: ${JSON.stringify({ status: 'PENDING' })}\n\n`);
                } else {
                    res.write(`data: ${JSON.stringify({ status: 'PENDING' })}\n\n`);
                }

            } catch (err) {
                console.error('SSE Error:', err.message);
            }
        }, 3000);

        req.on('close', () => {
            clearInterval(intervalId);
        });
    }
};

module.exports = paymentController;
