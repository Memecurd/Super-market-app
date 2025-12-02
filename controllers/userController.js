/**
 * User Controller (controllers/userController.js)
 * 
 * Handles all user-related operations:
 * - Home page display
 * - User registration
 * - User login/logout
 * - Session management
 */

const User = require('../models/User');

const userController = {
    // ===========================================
    // HOME PAGE
    // ===========================================
    
    /**
     * GET / - Display home page
     */
    getHomePage: (req, res) => {
        res.render('index', {
            title: 'Welcome to SupermarketApp'
        });
    },

    // ===========================================
    // REGISTRATION
    // ===========================================
    
    /**
     * GET /register - Display registration form
     */
    getRegisterPage: (req, res) => {
        const formData = req.flash('formData')[0] || {};
        res.render('register', {
            title: 'Register',
            formData
        });
    },

    /**
     * POST /register - Process registration
     * Validation is handled by middleware
     */
    postRegister: async (req, res) => {
        try {
            const { username, email, password, address, contact, role } = req.body;

            // Check if email already exists
            const existingUser = await User.findByEmail(email);
            if (existingUser) {
                req.flash('error', 'An account with this email already exists');
                req.flash('formData', req.body);
                return res.redirect('/register');
            }

            // Create new user
            await User.createUser({
                username: username.trim(),
                email: email.trim().toLowerCase(),
                password,
                address: address.trim(),
                contact: contact.trim(),
                role: role || 'user' // Default to 'user' role
            });

            req.flash('success', 'Registration successful! Please log in.');
            res.redirect('/login');
        } catch (error) {
            console.error('Registration error:', error);
            req.flash('error', 'Registration failed. Please try again.');
            req.flash('formData', req.body);
            res.redirect('/register');
        }
    },

    // ===========================================
    // LOGIN
    // ===========================================
    
    /**
     * GET /login - Display login form
     */
    getLoginPage: (req, res) => {
        res.render('login', {
            title: 'Login'
        });
    },

    /**
     * POST /login - Process login
     * Validation is handled by middleware
     */
    postLogin: async (req, res) => {
        try {
            const { email, password } = req.body;

            // Find user by email and password
            const user = await User.findByEmailAndPassword(
                email.trim().toLowerCase(),
                password
            );

            if (!user) {
                req.flash('error', 'Invalid email or password');
                return res.redirect('/login');
            }

            // Store user in session (excluding password)
            req.session.user = user;
            
            // Initialize empty cart if not exists
            if (!req.session.cart) {
                req.session.cart = [];
            }

            req.flash('success', `Welcome back, ${user.username}!`);

            // Redirect based on role
            if (user.role === 'admin') {
                res.redirect('/inventory');
            } else {
                res.redirect('/shopping');
            }
        } catch (error) {
            console.error('Login error:', error);
            req.flash('error', 'Login failed. Please try again.');
            res.redirect('/login');
        }
    },

    // ===========================================
    // LOGOUT
    // ===========================================
    
    /**
     * GET /logout - Logout user and destroy session
     */
    logout: (req, res) => {
        const username = req.session.user ? req.session.user.username : 'User';
        
        req.session.destroy((err) => {
            if (err) {
                console.error('Logout error:', err);
            }
            res.redirect('/');
        });
    }
};

module.exports = userController;
