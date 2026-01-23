/**
 * Payment Routes (routes/paymentRoutes.js)
 */

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { checkAuthenticated } = require('../middleware/authMiddleware');

// ===========================================
// PAYPAL ENDPOINTS
// ===========================================
router.post('/api/paypal/create-order', checkAuthenticated, paymentController.createPayPalOrder);
router.post('/api/paypal/capture-order', checkAuthenticated, paymentController.capturePayPalOrder);

// ===========================================
// NETS QR ENDPOINTS
// ===========================================
router.post('/api/nets/qr', checkAuthenticated, paymentController.generateNetsQr);

router.get('/sse/payment-status/:txnRef', paymentController.paymentStatusSSE);

// ===========================================
// PAYMENT RESULT PAGES
// ===========================================
router.get('/payment/success', checkAuthenticated, (req, res) => {
    res.render('payment/success', { title: 'Payment Successful' });
});

router.get('/payment/fail', checkAuthenticated, (req, res) => {
    res.render('payment/fail', { title: 'Payment Failed' });
});

module.exports = router;
