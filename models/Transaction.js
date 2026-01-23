/**
 * Transaction Model (models/Transaction.js)
 * 
 * Handles all database operations for the 'transactions' table.
 * Used for payment tracking and idempotency.
 */

const { promisePool } = require('../config/db');

const Transaction = {
    /**
     * Create a new transaction record
     * @param {Object} data - { txn_ref, provider_ref, user_id, provider, amount, status }
     * @returns {Promise<Object>} Result
     */
    async create(data) {
        try {
            const { txn_ref, provider_ref, user_id, provider, amount, status = 'PENDING' } = data;
            const [result] = await promisePool.query(
                'INSERT INTO transactions (txn_ref, provider_ref, user_id, provider, amount, status) VALUES (?, ?, ?, ?, ?, ?)',
                [txn_ref, provider_ref, user_id, provider, amount, status]
            );
            return result;
        } catch (error) {
            console.error('Error in Transaction.create:', error);
            throw error;
        }
    },

    /**
     * Find a transaction by its reference (Order ID or Txn Ref)
     * @param {string} txnRef 
     * @returns {Promise<Object|null>}
     */
    async findByRef(txnRef) {
        try {
            // Search by either internal txn_ref OR provider_ref (if useful)
            // Ideally we stick to one main ref. For NETS, txnRef is internal. 
            // For PayPal, we use OrderID as txnRef usually.
            const [rows] = await promisePool.query(
                'SELECT * FROM transactions WHERE txn_ref = ?',
                [txnRef]
            );
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('Error in Transaction.findByRef:', error);
            throw error;
        }
    },

    /**
     * Update transaction status
     * @param {string} txnRef 
     * @param {string} status - 'PENDING', 'PAID', 'FAILED', 'TIMEOUT'
     * @returns {Promise<Object>}
     */
    async updateStatus(txnRef, status) {
        try {
            const [result] = await promisePool.query(
                'UPDATE transactions SET status = ? WHERE txn_ref = ?',
                [status, txnRef]
            );
            return result;
        } catch (error) {
            console.error('Error in Transaction.updateStatus:', error);
            throw error;
        }
    },

    /**
     * Check if a transaction is already PAID
     * @param {string} txnRef 
     * @returns {Promise<boolean>}
     */
    async isPaid(txnRef) {
        try {
            const transaction = await this.findByRef(txnRef);
            return transaction && transaction.status === 'PAID';
        } catch (error) {
            console.error('Error in Transaction.isPaid:', error);
            throw error;
        }
    },

    /**
     * Add provider reference to existing transaction (if not set during create)
     */
    async setProviderRef(txnRef, providerRef) {
        try {
            const [result] = await promisePool.query(
                'UPDATE transactions SET provider_ref = ? WHERE txn_ref = ?',
                [providerRef, txnRef]
            );
            return result;
        } catch (error) {
            console.error('Error in Transaction.setProviderRef:', error);
            throw error;
        }
    }
};

module.exports = Transaction;
