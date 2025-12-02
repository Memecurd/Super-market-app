/**
 * Database Configuration (config/db.js)
 * 
 * Sets up MySQL connection pool using mysql2 with promise support.
 * Using a pool is more efficient than single connections for web apps.
 * 
 * CONFIGURATION:
 * Set these environment variables or modify the defaults below:
 * - DB_HOST: MySQL server hostname (default: localhost)
 * - DB_USER: MySQL username (default: root)
 * - DB_PASSWORD: MySQL password (default: empty)
 * - DB_NAME: Database name (default: c372_supermarketdb)
 */

const mysql = require('mysql2');

// Create a connection pool for better performance
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Republic_C207', // ⚠️ CHANGE THIS to your MySQL password
    database: process.env.DB_NAME || 'c372_supermarketdb',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Get promise-based pool for async/await usage
const promisePool = pool.promise();

// Test the connection on startup
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
        console.error('   Please check your database configuration in config/db.js');
        return;
    }
    console.log('✅ Connected to MySQL database: c372_supermarketdb');
    connection.release();
});

module.exports = {
    pool,           // For callback-based queries
    promisePool     // For async/await queries
};
