/**
 * User Model (models/User.js)
 * 
 * Handles all database operations for the 'users' table.
 * 
 * Table structure:
 * - id: INT, Primary Key, Auto Increment
 * - username: VARCHAR(20)
 * - email: VARCHAR(255)
 * - password: VARCHAR(255) - stored as SHA1 hash
 * - address: VARCHAR(255)
 * - contact: VARCHAR(10)
 * - role: VARCHAR(10) - 'admin' or 'user'
 * 
 * ⚠️ SECURITY NOTE: SHA1 is used to match existing database.
 * For production, use bcrypt or argon2 for password hashing.
 * See comments in createUser() for upgrade path.
 */

const { promisePool } = require('../config/db');

const User = {
    /**
     * Create a new user with SHA1 hashed password
     * @param {Object} data - User data { username, email, password, address, contact, role }
     * @returns {Promise<Object>} Result with insertId
     * 
     * ⚠️ For better security in production, replace SHA1 with bcrypt:
     * const bcrypt = require('bcrypt');
     * const hashedPassword = await bcrypt.hash(password, 10);
     */
    async createUser(data) {
        try {
            const { username, email, password, address, contact, role } = data;
            
            // Using SHA1 to match existing database structure
            // In production, use: const bcrypt = require('bcrypt'); await bcrypt.hash(password, 10)
            const [result] = await promisePool.query(
                'INSERT INTO users (username, email, password, address, contact, role) VALUES (?, ?, SHA1(?), ?, ?, ?)',
                [username, email, password, address, contact, role || 'user']
            );
            return result;
        } catch (error) {
            console.error('Error in User.createUser:', error);
            throw error;
        }
    },

    /**
     * Find user by email and password (for login)
     * @param {string} email - User email
     * @param {string} password - Plain text password (will be SHA1 hashed for comparison)
     * @returns {Promise<Object|null>} User object (without password) or null if not found
     * 
     * ⚠️ For bcrypt: 
     * const user = await findByEmail(email);
     * const match = await bcrypt.compare(password, user.password);
     */
    async findByEmailAndPassword(email, password) {
        try {
            const [rows] = await promisePool.query(
                'SELECT id, username, email, address, contact, role FROM users WHERE email = ? AND password = SHA1(?)',
                [email, password]
            );
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('Error in User.findByEmailAndPassword:', error);
            throw error;
        }
    },

    /**
     * Find user by ID
     * @param {number} id - User ID
     * @returns {Promise<Object|null>} User object (without password) or null if not found
     */
    async findById(id) {
        try {
            const [rows] = await promisePool.query(
                'SELECT id, username, email, address, contact, role FROM users WHERE id = ?',
                [id]
            );
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('Error in User.findById:', error);
            throw error;
        }
    },

    /**
     * Find user by email (to check if email already exists)
     * @param {string} email - User email
     * @returns {Promise<Object|null>} User object or null if not found
     */
    async findByEmail(email) {
        try {
            const [rows] = await promisePool.query(
                'SELECT id, username, email, role FROM users WHERE email = ?',
                [email]
            );
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('Error in User.findByEmail:', error);
            throw error;
        }
    },

    /**
     * Get all users (for admin purposes)
     * @returns {Promise<Array>} Array of all users (without passwords)
     */
    async getAll() {
        try {
            const [rows] = await promisePool.query(
                'SELECT id, username, email, address, contact, role FROM users ORDER BY username ASC'
            );
            return rows;
        } catch (error) {
            console.error('Error in User.getAll:', error);
            throw error;
        }
    },

    /**
     * Update user profile
     * @param {number} id - User ID
     * @param {Object} data - Updated data { username, email, address, contact }
     * @returns {Promise<Object>} Result with affectedRows
     */
    async update(id, data) {
        try {
            const { username, email, address, contact } = data;
            const [result] = await promisePool.query(
                'UPDATE users SET username = ?, email = ?, address = ?, contact = ? WHERE id = ?',
                [username, email, address, contact, id]
            );
            return result;
        } catch (error) {
            console.error('Error in User.update:', error);
            throw error;
        }
    },

    /**
     * Update user password
     * @param {number} id - User ID
     * @param {string} newPassword - New plain text password
     * @returns {Promise<Object>} Result with affectedRows
     */
    async updatePassword(id, newPassword) {
        try {
            const [result] = await promisePool.query(
                'UPDATE users SET password = SHA1(?) WHERE id = ?',
                [newPassword, id]
            );
            return result;
        } catch (error) {
            console.error('Error in User.updatePassword:', error);
            throw error;
        }
    }
};

module.exports = User;
