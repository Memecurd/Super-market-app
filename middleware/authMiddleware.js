/**
 * Authentication Middleware (middleware/authMiddleware.js)
 * 
 * Provides middleware functions for protecting routes:
 * - checkAuthenticated: Ensures user is logged in
 * - checkAdmin: Ensures user is an admin
 * - checkNotAuthenticated: Ensures user is NOT logged in (for login/register pages)
 */

/**
 * Middleware to check if user is logged in
 * Redirects to login page if not authenticated
 */
const checkAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    
    req.flash('error', 'Please log in to access this page');
    res.redirect('/login');
};

/**
 * Middleware to check if user is an admin
 * Must be used AFTER checkAuthenticated
 * Redirects to shopping page if not an admin
 */
const checkAdmin = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    
    req.flash('error', 'Access denied. Admin privileges required.');
    res.redirect('/shopping');
};

/**
 * Middleware to check if user is NOT authenticated
 * Used for login/register pages - redirects logged-in users away
 */
const checkNotAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        // If already logged in, redirect based on role
        if (req.session.user.role === 'admin') {
            return res.redirect('/inventory');
        }
        return res.redirect('/shopping');
    }
    
    next();
};

/**
 * Middleware to validate registration form data
 * Checks for required fields and password length
 */
const validateRegistration = (req, res, next) => {
    const { username, email, password, address, contact } = req.body;
    const errors = [];

    // Check required fields
    if (!username || username.trim() === '') {
        errors.push('Username is required');
    } else if (username.length < 3 || username.length > 20) {
        errors.push('Username must be between 3 and 20 characters');
    }

    if (!email || email.trim() === '') {
        errors.push('Email is required');
    } else if (!isValidEmail(email)) {
        errors.push('Please enter a valid email address');
    }

    if (!password) {
        errors.push('Password is required');
    } else if (password.length < 6) {
        errors.push('Password must be at least 6 characters long');
    }

    if (!address || address.trim() === '') {
        errors.push('Address is required');
    }

    if (!contact || contact.trim() === '') {
        errors.push('Contact number is required');
    } else if (!isValidContact(contact)) {
        errors.push('Contact must be 8-10 digits');
    }

    if (errors.length > 0) {
        req.flash('error', errors);
        req.flash('formData', req.body);
        return res.redirect('/register');
    }

    next();
};

/**
 * Middleware to validate login form data
 */
const validateLogin = (req, res, next) => {
    const { email, password } = req.body;
    const errors = [];

    if (!email || email.trim() === '') {
        errors.push('Email is required');
    }

    if (!password) {
        errors.push('Password is required');
    }

    if (errors.length > 0) {
        req.flash('error', errors);
        return res.redirect('/login');
    }

    next();
};

/**
 * Middleware to validate product form data
 */
const validateProduct = (req, res, next) => {
    const { name, quantity, price } = req.body;
    const errors = [];

    if (!name || name.trim() === '') {
        errors.push('Product name is required');
    }

    if (quantity === undefined || quantity === '' || isNaN(quantity) || parseInt(quantity) < 0) {
        errors.push('Valid quantity is required (0 or more)');
    }

    if (price === undefined || price === '' || isNaN(price) || parseFloat(price) < 0) {
        errors.push('Valid price is required (0 or more)');
    }

    if (errors.length > 0) {
        req.flash('error', errors);
        req.flash('formData', req.body);
        
        // Redirect back to the form page
        const referer = req.get('Referer') || '/inventory';
        return res.redirect(referer);
    }

    next();
};

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Validate email format
 * @param {string} email 
 * @returns {boolean}
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate contact number (8-10 digits)
 * @param {string} contact 
 * @returns {boolean}
 */
function isValidContact(contact) {
    const contactRegex = /^\d{8,10}$/;
    return contactRegex.test(contact);
}

module.exports = {
    checkAuthenticated,
    checkAdmin,
    checkNotAuthenticated,
    validateRegistration,
    validateLogin,
    validateProduct
};
