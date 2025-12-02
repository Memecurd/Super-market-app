/**
 * SupermarketApp - MVC Structure
 * Main entry point (app.js)
 * 
 * This file initializes the Express application with minimal logic.
 * All route handling is delegated to controllers via route files.
 */

const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');

// Import route modules
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');

const app = express();

// ===========================================
// VIEW ENGINE SETUP
// ===========================================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ===========================================
// MIDDLEWARE SETUP
// ===========================================

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Parse URL-encoded bodies (form submissions)
app.use(express.urlencoded({ extended: false }));

// Parse JSON bodies
app.use(express.json());

// ===========================================
// SESSION CONFIGURATION
// ===========================================
app.use(session({
    secret: process.env.SESSION_SECRET || 'supermarket-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
        secure: false // Set to true in production with HTTPS
    }
}));

// Flash messages middleware
app.use(flash());

// ===========================================
// GLOBAL TEMPLATE VARIABLES
// Makes user, cart, and flash messages available to all views
// ===========================================
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.cart = req.session.cart || [];
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    res.locals.cartCount = req.session.cart ? req.session.cart.reduce((sum, item) => sum + item.quantity, 0) : 0;
    next();
});

// ===========================================
// ROUTES
// ===========================================

// User routes (home, login, register, logout)
app.use('/', userRoutes);

// Product routes (inventory, shopping, cart, etc.)
app.use('/', productRoutes);

// ===========================================
// 404 HANDLER
// ===========================================
app.use((req, res) => {
    res.status(404).render('404', { title: 'Page Not Found' });
});

// ===========================================
// ERROR HANDLER
// ===========================================
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).render('error', { 
        title: 'Error',
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

// ===========================================
// START SERVER
// ===========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🛒 JustFee running on http://localhost:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
