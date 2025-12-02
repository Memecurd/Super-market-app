/**
 * Product Model (models/Product.js)
 * 
 * Handles all database operations for the 'products' table.
 * Each function corresponds to a specific database operation.
 * 
 * Table structure:
 * - id: INT, Primary Key, Auto Increment
 * - productName: VARCHAR(200)
 * - quantity: INT (stock quantity)
 * - price: DOUBLE(10,2)
 * - image: VARCHAR(50) (filename of product image)
 */

const { promisePool } = require('../config/db');

const Product = {
    /**
     * Get all products from the database
     * @returns {Promise<Array>} Array of all products
     */
    async getAll() {
        try {
            const [rows] = await promisePool.query(
                'SELECT * FROM products ORDER BY productName ASC'
            );
            return rows;
        } catch (error) {
            console.error('Error in Product.getAll:', error);
            throw error;
        }
    },

    /**
     * Get a single product by ID
     * @param {number} id - Product ID
     * @returns {Promise<Object|null>} Product object or null if not found
     */
    async getById(id) {
        try {
            const [rows] = await promisePool.query(
                'SELECT * FROM products WHERE id = ?',
                [id]
            );
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('Error in Product.getById:', error);
            throw error;
        }
    },

    /**
     * Create a new product
     * @param {Object} data - Product data { productName, quantity, price, image }
     * @returns {Promise<Object>} Result with insertId
     */
    async create(data) {
        try {
            const { productName, quantity, price, image } = data;
            const [result] = await promisePool.query(
                'INSERT INTO products (productName, quantity, price, image) VALUES (?, ?, ?, ?)',
                [productName, quantity, price, image]
            );
            return result;
        } catch (error) {
            console.error('Error in Product.create:', error);
            throw error;
        }
    },

    /**
     * Update an existing product
     * @param {number} id - Product ID to update
     * @param {Object} data - Updated product data { productName, quantity, price, image }
     * @returns {Promise<Object>} Result with affectedRows
     */
    async update(id, data) {
        try {
            const { productName, quantity, price, image } = data;
            const [result] = await promisePool.query(
                'UPDATE products SET productName = ?, quantity = ?, price = ?, image = ? WHERE id = ?',
                [productName, quantity, price, image, id]
            );
            return result;
        } catch (error) {
            console.error('Error in Product.update:', error);
            throw error;
        }
    },

    /**
     * Delete a product by ID
     * @param {number} id - Product ID to delete
     * @returns {Promise<Object>} Result with affectedRows
     */
    async delete(id) {
        try {
            const [result] = await promisePool.query(
                'DELETE FROM products WHERE id = ?',
                [id]
            );
            return result;
        } catch (error) {
            console.error('Error in Product.delete:', error);
            throw error;
        }
    },

    /**
     * Search products by name (case-insensitive partial match)
     * @param {string} term - Search term
     * @returns {Promise<Array>} Array of matching products
     */
    async search(term) {
        try {
            const [rows] = await promisePool.query(
                'SELECT * FROM products WHERE productName LIKE ? ORDER BY productName ASC',
                [`%${term}%`]
            );
            return rows;
        } catch (error) {
            console.error('Error in Product.search:', error);
            throw error;
        }
    },

    /**
     * Get products with low stock (quantity <= threshold)
     * @param {number} threshold - Stock threshold (default: 20)
     * @returns {Promise<Array>} Array of low-stock products
     */
    async getLowStock(threshold = 20) {
        try {
            const [rows] = await promisePool.query(
                'SELECT * FROM products WHERE quantity <= ? ORDER BY quantity ASC',
                [threshold]
            );
            return rows;
        } catch (error) {
            console.error('Error in Product.getLowStock:', error);
            throw error;
        }
    },

    /**
     * Update product quantity (for stock management during checkout)
     * @param {number} id - Product ID
     * @param {number} quantityChange - Amount to decrease (positive number)
     * @returns {Promise<Object>} Result with affectedRows
     */
    async updateQuantity(id, quantityChange) {
        try {
            const [result] = await promisePool.query(
                'UPDATE products SET quantity = quantity - ? WHERE id = ? AND quantity >= ?',
                [quantityChange, id, quantityChange]
            );
            return result;
        } catch (error) {
            console.error('Error in Product.updateQuantity:', error);
            throw error;
        }
    },

    /**
     * Check if product has sufficient stock
     * @param {number} id - Product ID
     * @param {number} requestedQuantity - Quantity needed
     * @returns {Promise<boolean>} True if sufficient stock available
     */
    async hasStock(id, requestedQuantity) {
        try {
            const product = await this.getById(id);
            return product && product.quantity >= requestedQuantity;
        } catch (error) {
            console.error('Error in Product.hasStock:', error);
            throw error;
        }
    }
};

module.exports = Product;
