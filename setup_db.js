const { promisePool } = require('./config/db');

async function createTransactionsTable() {
    try {
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                txn_ref VARCHAR(255) UNIQUE NOT NULL,
                provider ENUM('PAYPAL', 'NETS') NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                status ENUM('PENDING', 'PAID', 'FAILED', 'TIMEOUT') DEFAULT 'PENDING',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;

        await promisePool.query(createTableQuery);
        console.log('✅ Transactions table created successfully (or already exists).');
    } catch (error) {
        console.error('❌ Error creating transactions table:', error);
    } finally {
        process.exit();
    }
}

createTransactionsTable();
