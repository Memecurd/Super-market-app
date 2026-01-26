/**
 * Product Routes (routes/productRoutes.js)
 * 
 * Defines routes for product-related operations:
 * - Admin: /inventory, /addProduct, /updateProduct/:id, /deleteProduct/:id
 * - Shopping: /shopping, /product/:id
 * - Cart: /add-to-cart/:id, /cart, /cart/update/:id, /cart/remove/:id, /cart/checkout
 */

const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { 
    checkAuthenticated, 
    checkAdmin,
    validateProduct 
} = require('../middleware/authMiddleware');

// ===========================================
// ADMIN ROUTES (require admin role)
// ===========================================

// GET /inventory - Display product inventory
router.get('/inventory', 
    checkAuthenticated, 
    checkAdmin, 
    productController.getInventory
);

// GET /addProduct - Display add product form
router.get('/addProduct', 
    checkAuthenticated, 
    checkAdmin, 
    productController.getAddProductPage
);

// POST /addProduct - Create new product
// Uses multer middleware for image upload
router.post('/addProduct', 
    checkAuthenticated, 
    checkAdmin, 
    productController.upload.single('image'),
    validateProduct,
    productController.postAddProduct
);

// GET /updateProduct/:id - Display update product form
router.get('/updateProduct/:id', 
    checkAuthenticated, 
    checkAdmin, 
    productController.getUpdateProductPage
);

// POST /updateProduct/:id - Update existing product
router.post('/updateProduct/:id', 
    checkAuthenticated, 
    checkAdmin, 
    productController.upload.single('image'),
    validateProduct,
    productController.postUpdateProduct
);

// GET /deleteProduct/:id - Delete product
router.get('/deleteProduct/:id', 
    checkAuthenticated, 
    checkAdmin, 
    productController.deleteProduct
);

// ===========================================
// SHOPPING ROUTES (require authentication)
// ===========================================

// GET /shopping - Display products for shopping
router.get('/shopping', 
    checkAuthenticated, 
    productController.getShopping
);

// GET /product/:id - Display single product details
router.get('/product/:id', 
    checkAuthenticated, 
    productController.getProductDetails
);

// ===========================================
// CART ROUTES (require authentication)
// ===========================================

// POST /add-to-cart/:id - Add product to cart
router.post('/add-to-cart/:id', 
    checkAuthenticated, 
    productController.addToCart
);

// GET /cart - Display cart contents
router.get('/cart', 
    checkAuthenticated, 
    productController.getCart
);

// POST /cart/update/:id - Update cart item quantity
router.post('/cart/update/:id', 
    checkAuthenticated, 
    productController.updateCartItem
);

// GET /cart/remove/:id - Remove item from cart
router.get('/cart/remove/:id', 
    checkAuthenticated, 
    productController.removeFromCart
);

// POST /cart/checkout - Process checkout
router.post('/cart/checkout', 
    checkAuthenticated, 
    productController.checkout
);

// ===========================================
// ORDER MANAGEMENT ROUTES
// ===========================================
router.get('/orders', checkAuthenticated, productController.getOrders);
router.get('/orders/invoice/:id', checkAuthenticated, productController.getInvoice);

module.exports = router;
