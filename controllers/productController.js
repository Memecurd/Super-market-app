/**
 * Product Controller (controllers/productController.js)
 * 
 * Handles all product-related operations:
 * - Admin inventory management (CRUD)
 * - Shopping page display
 * - Product details
 * - Cart operations (add, view, update, remove, checkout)
 */

const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const multer = require('multer');
const path = require('path');

// ===========================================
// MULTER CONFIGURATION FOR IMAGE UPLOADS
// ===========================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../public/images'));
    },
    filename: (req, file, cb) => {
        // Keep original filename or use timestamp to avoid conflicts
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

// File filter - only allow images
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Low stock threshold
const LOW_STOCK_THRESHOLD = 20;

const productController = {
    // Export upload middleware for use in routes
    upload,

    // ===========================================
    // ADMIN: INVENTORY MANAGEMENT
    // ===========================================

    /**
     * GET /inventory - Display product inventory (Admin)
     * Includes search functionality and low-stock highlighting
     */
    getInventory: async (req, res) => {
        try {
            const searchTerm = req.query.search || '';
            let products;

            if (searchTerm) {
                products = await Product.search(searchTerm);
            } else {
                products = await Product.getAll();
            }

            // Mark low stock products
            products = products.map(product => ({
                ...product,
                isLowStock: product.quantity <= LOW_STOCK_THRESHOLD
            }));

            res.render('inventory', {
                title: 'Product Inventory',
                products,
                searchTerm,
                lowStockThreshold: LOW_STOCK_THRESHOLD
            });
        } catch (error) {
            console.error('Error fetching inventory:', error);
            req.flash('error', 'Failed to load inventory');
            res.redirect('/');
        }
    },

    /**
     * GET /admin/orders - Display all orders (Admin)
     */
    getAdminOrders: async (req, res) => {
        try {
            const orders = await Transaction.getAllWithUsers();
            res.render('adminOrders', {
                title: 'Manage Orders',
                orders
            });
        } catch (error) {
            console.error('Error fetching admin orders:', error);
            req.flash('error', 'Failed to load orders');
            res.redirect('/');
        }
    },

    /**
     * POST /admin/orders/update - Update order status (Admin)
     */
    updateOrderStatus: async (req, res) => {
        try {
            const { txnRef, status } = req.body;
            await Transaction.updateStatus(txnRef, status);
            req.flash('success', `Order ${txnRef} updated to ${status}`);
            res.redirect('/admin/orders');
        } catch (error) {
            console.error('Error updating order status:', error);
            req.flash('error', 'Failed to update order status');
            res.redirect('/admin/orders');
        }
    },

    /**
     * GET /addProduct - Display add product form (Admin)
     */
    getAddProductPage: (req, res) => {
        const formData = req.flash('formData')[0] || {};
        res.render('addProduct', {
            title: 'Add New Product',
            formData
        });
    },

    /**
     * POST /addProduct - Create new product (Admin)
     */
    postAddProduct: async (req, res) => {
        try {
            const { name, quantity, price } = req.body;
            const image = req.file ? req.file.filename : 'default.png';

            await Product.create({
                productName: name.trim(),
                quantity: parseInt(quantity),
                price: parseFloat(price),
                image
            });

            req.flash('success', `Product "${name}" added successfully!`);
            res.redirect('/inventory');
        } catch (error) {
            console.error('Error adding product:', error);
            req.flash('error', 'Failed to add product');
            req.flash('formData', req.body);
            res.redirect('/addProduct');
        }
    },

    /**
     * GET /updateProduct/:id - Display update product form (Admin)
     */
    getUpdateProductPage: async (req, res) => {
        try {
            const productId = parseInt(req.params.id);
            const product = await Product.getById(productId);

            if (!product) {
                req.flash('error', 'Product not found');
                return res.redirect('/inventory');
            }

            res.render('updateProduct', {
                title: 'Update Product',
                product
            });
        } catch (error) {
            console.error('Error loading product for update:', error);
            req.flash('error', 'Failed to load product');
            res.redirect('/inventory');
        }
    },

    /**
     * POST /updateProduct/:id - Update existing product (Admin)
     */
    postUpdateProduct: async (req, res) => {
        try {
            const productId = parseInt(req.params.id);
            const { name, quantity, price, currentImage } = req.body;

            // Use new image if uploaded, otherwise keep current
            const image = req.file ? req.file.filename : currentImage;

            await Product.update(productId, {
                productName: name.trim(),
                quantity: parseInt(quantity),
                price: parseFloat(price),
                image
            });

            req.flash('success', `Product "${name}" updated successfully!`);
            res.redirect('/inventory');
        } catch (error) {
            console.error('Error updating product:', error);
            req.flash('error', 'Failed to update product');
            res.redirect(`/updateProduct/${req.params.id}`);
        }
    },

    /**
     * GET /deleteProduct/:id - Delete product (Admin)
     */
    deleteProduct: async (req, res) => {
        try {
            const productId = parseInt(req.params.id);
            const product = await Product.getById(productId);

            if (!product) {
                req.flash('error', 'Product not found');
                return res.redirect('/inventory');
            }

            await Product.delete(productId);
            req.flash('success', `Product "${product.productName}" deleted successfully!`);
            res.redirect('/inventory');
        } catch (error) {
            console.error('Error deleting product:', error);
            req.flash('error', 'Failed to delete product');
            res.redirect('/inventory');
        }
    },

    // ===========================================
    // SHOPPING PAGE
    // ===========================================

    /**
     * GET /shopping - Display products for shopping
     * Includes search functionality
     */
    getShopping: async (req, res) => {
        try {
            const searchTerm = req.query.search || '';
            let products;

            if (searchTerm) {
                products = await Product.search(searchTerm);
            } else {
                products = await Product.getAll();
            }

            // Filter out products with zero stock for shopping
            products = products.filter(product => product.quantity > 0);

            res.render('shopping', {
                title: 'Shop Products',
                products,
                searchTerm
            });
        } catch (error) {
            console.error('Error loading shopping page:', error);
            req.flash('error', 'Failed to load products');
            res.redirect('/');
        }
    },

    /**
     * GET /product/:id - Display single product details
     */
    getProductDetails: async (req, res) => {
        try {
            const productId = parseInt(req.params.id);
            const product = await Product.getById(productId);

            if (!product) {
                req.flash('error', 'Product not found');
                return res.redirect('/shopping');
            }

            res.render('product', {
                title: product.productName,
                product
            });
        } catch (error) {
            console.error('Error loading product details:', error);
            req.flash('error', 'Failed to load product details');
            res.redirect('/shopping');
        }
    },

    // ===========================================
    // CART OPERATIONS
    // ===========================================

    /**
     * POST /add-to-cart/:id - Add product to cart
     * Includes stock validation
     */
    addToCart: async (req, res) => {
        try {
            const productId = parseInt(req.params.id);
            const requestedQty = parseInt(req.body.quantity) || 1;

            // Fetch product from database
            const product = await Product.getById(productId);

            if (!product) {
                req.flash('error', 'Product not found');
                return res.redirect('/shopping');
            }

            // Initialize cart if not exists
            if (!req.session.cart) {
                req.session.cart = [];
            }

            // Check if product already in cart
            const existingItem = req.session.cart.find(item => item.productId === productId);
            const currentCartQty = existingItem ? existingItem.quantity : 0;
            const totalRequestedQty = currentCartQty + requestedQty;

            // Stock validation - don't allow adding more than available
            if (totalRequestedQty > product.quantity) {
                const availableToAdd = product.quantity - currentCartQty;
                if (availableToAdd <= 0) {
                    req.flash('error', `Sorry, "${product.productName}" is already at maximum stock in your cart`);
                } else {
                    req.flash('error', `Sorry, only ${availableToAdd} more "${product.productName}" can be added (${product.quantity} in stock)`);
                }
                return res.redirect('/shopping');
            }

            if (existingItem) {
                // Update quantity if already in cart
                existingItem.quantity += requestedQty;
            } else {
                // Add new item to cart
                req.session.cart.push({
                    productId: product.id,
                    productName: product.productName,
                    price: product.price,
                    quantity: requestedQty,
                    image: product.image,
                    maxStock: product.quantity // Store max available for validation
                });
            }

            req.flash('success', `Added ${requestedQty} x "${product.productName}" to cart`);
            res.redirect('/shopping');
        } catch (error) {
            console.error('Error adding to cart:', error);
            req.flash('error', 'Failed to add product to cart');
            res.redirect('/shopping');
        }
    },

    /**
     * GET /cart - Display cart contents
     */
    getCart: async (req, res) => {
        try {
            const cart = req.session.cart || [];

            // Calculate total
            const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            // Update maxStock for each item (in case stock changed)
            for (let item of cart) {
                const product = await Product.getById(item.productId);
                if (product) {
                    item.maxStock = product.quantity;
                }
            }

            console.log('Rendering Cart with PayPal Client ID:', process.env.PAYPAL_CLIENT_ID ? 'LOADED' : 'MISSING');
            res.render('cart', {
                title: 'Shopping Cart',
                cart,
                total,
                paypalClientId: process.env.PAYPAL_CLIENT_ID,
                metamaskAddress: process.env.METAMASK_WALLET_ADDRESS
            });
        } catch (error) {
            console.error('Error loading cart:', error);
            req.flash('error', 'Failed to load cart');
            res.redirect('/shopping');
        }
    },

    /**
     * POST /cart/update/:id - Update cart item quantity
     */
    updateCartItem: async (req, res) => {
        try {
            const productId = parseInt(req.params.id);
            const newQuantity = parseInt(req.body.quantity);

            if (!req.session.cart) {
                req.flash('error', 'Cart is empty');
                return res.redirect('/cart');
            }

            const cartItem = req.session.cart.find(item => item.productId === productId);

            if (!cartItem) {
                req.flash('error', 'Item not found in cart');
                return res.redirect('/cart');
            }

            // Validate quantity
            if (newQuantity <= 0) {
                // Remove item if quantity is 0 or negative
                req.session.cart = req.session.cart.filter(item => item.productId !== productId);
                req.flash('success', `"${cartItem.productName}" removed from cart`);
            } else {
                // Check stock availability
                const product = await Product.getById(productId);
                if (product && newQuantity > product.quantity) {
                    req.flash('error', `Only ${product.quantity} "${cartItem.productName}" available in stock`);
                } else {
                    cartItem.quantity = newQuantity;
                    req.flash('success', `Updated "${cartItem.productName}" quantity to ${newQuantity}`);
                }
            }

            res.redirect('/cart');
        } catch (error) {
            console.error('Error updating cart:', error);
            req.flash('error', 'Failed to update cart');
            res.redirect('/cart');
        }
    },

    /**
     * GET /cart/remove/:id - Remove item from cart
     */
    removeFromCart: (req, res) => {
        try {
            const productId = parseInt(req.params.id);

            if (!req.session.cart) {
                req.flash('error', 'Cart is empty');
                return res.redirect('/cart');
            }

            const cartItem = req.session.cart.find(item => item.productId === productId);

            if (cartItem) {
                req.session.cart = req.session.cart.filter(item => item.productId !== productId);
                req.flash('success', `"${cartItem.productName}" removed from cart`);
            } else {
                req.flash('error', 'Item not found in cart');
            }

            res.redirect('/cart');
        } catch (error) {
            console.error('Error removing from cart:', error);
            req.flash('error', 'Failed to remove item from cart');
            res.redirect('/cart');
        }
    },

    /**
     * Helper: Finalize Order
     * Updates inventory, clears cart, and handles post-order logic.
     * @param {Object} req - Express request object (to access session)
     * @param {Array} cart - Cart items
     * @param {number} transactionId - Internal Transaction ID (Optional)
     * @returns {Object} Order summary
     */
    finalizeOrder: async (req, cart, transactionId = null) => {
        // Update stock for each product
        for (const item of cart) {
            await Product.updateQuantity(item.productId, item.quantity);
        }

        // Save Order Items (if transaction exists)
        if (transactionId) {
            await Transaction.saveOrderItems(transactionId, cart);
        }

        // Calculate order total
        const orderTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const orderItems = [...cart]; // Copy cart items

        // Link transaction to order (if we had an Orders table, we'd insert here)
        // For now, we assume the Transaction table acts as the order record
        if (transactionId) {
            console.log(`Order finalized for Transaction ID: ${transactionId}`);
        }

        // Clear cart
        req.session.cart = [];

        return { orderItems, orderTotal };
    },

    /**
     * POST /cart/checkout - Process checkout
     * Updates stock quantities and clears cart
     */
    checkout: async (req, res) => {
        try {
            const cart = req.session.cart || [];

            if (cart.length === 0) {
                req.flash('error', 'Your cart is empty');
                return res.redirect('/cart');
            }

            // Validate stock availability for all items
            const stockErrors = [];
            for (const item of cart) {
                const product = await Product.getById(item.productId);
                if (!product) {
                    stockErrors.push(`"${item.productName}" is no longer available`);
                } else if (product.quantity < item.quantity) {
                    stockErrors.push(`Only ${product.quantity} "${item.productName}" available (you requested ${item.quantity})`);
                }
            }

            if (stockErrors.length > 0) {
                req.flash('error', stockErrors);
                return res.redirect('/cart');
            }

            // Finalize order
            const { orderItems, orderTotal } = await productController.finalizeOrder(req, cart);

            // Render checkout confirmation
            res.render('checkout', {
                title: 'Order Confirmed',
                orderItems,
                orderTotal,
                orderDate: new Date().toLocaleDateString('en-SG', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })
            });
        } catch (error) {
            console.error('Checkout error:', error);
            req.flash('error', 'Checkout failed. Please try again.');
            res.redirect('/cart');
        }
    },

    /**
     * GET /orders - View user's order history
     */
    getOrders: async (req, res) => {
        try {
            const user = req.session.user;
            if (!user) return res.redirect('/login');

            const orders = await Transaction.getByUserId(user.id);
            res.render('orders', {
                title: 'My Orders',
                orders,
                user
            });
        } catch (error) {
            console.error('Error fetching orders:', error);
            req.flash('error', 'Failed to load orders');
            res.redirect('/');
        }
    },

    /**
     * GET /orders/invoice/:id - View/Download Invoice
     */
    getInvoice: async (req, res) => {
        try {
            const user = req.session.user;
            if (!user) return res.redirect('/login');

            const transactionId = req.params.id;
            const order = await Transaction.getByIdWithItems(transactionId);

            if (!order) {
                req.flash('error', 'Order not found');
                return res.redirect('/orders');
            }

            // Ensure order belongs to user or user is admin
            if (order.user_id !== user.id && user.role !== 'admin') {
                req.flash('error', 'Unauthorized access to invoice');
                return res.redirect('/orders');
            }

            res.render('invoice', {
                title: `Invoice #${order.txn_ref}`,
                order,
                user
            });
        } catch (error) {
            console.error('Error fetching invoice:', error);
            req.flash('error', 'Failed to load invoice');
            res.redirect('/orders');
        }
    }
};

module.exports = productController;
