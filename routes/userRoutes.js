/**
 * User Routes (routes/userRoutes.js)
 * 
 * Defines routes for user-related operations:
 * - / (Home page)
 * - /register (GET/POST)
 * - /login (GET/POST)
 * - /logout
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { 
    checkNotAuthenticated, 
    validateRegistration, 
    validateLogin 
} = require('../middleware/authMiddleware');

// ===========================================
// HOME PAGE
// ===========================================

// GET / - Home page (accessible to everyone)
router.get('/', userController.getHomePage);

// ===========================================
// REGISTRATION
// ===========================================

// GET /register - Display registration form
// checkNotAuthenticated prevents logged-in users from accessing
router.get('/register', checkNotAuthenticated, userController.getRegisterPage);

// POST /register - Process registration
// validateRegistration middleware validates form data before controller
router.post('/register', checkNotAuthenticated, validateRegistration, userController.postRegister);

// ===========================================
// LOGIN
// ===========================================

// GET /login - Display login form
router.get('/login', checkNotAuthenticated, userController.getLoginPage);

// POST /login - Process login
router.post('/login', checkNotAuthenticated, validateLogin, userController.postLogin);

// ===========================================
// LOGOUT
// ===========================================

// GET /logout - Logout user and destroy session
router.get('/logout', userController.logout);

module.exports = router;
