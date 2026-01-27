const { promisePool } = require('./config/db');

async function updateTransactionsTable() {
    try {
        // Drop table to ensure clean state with new schema (since it's dev environment)
        // OR ALTER TABLE if we wanted to preserve data. Given it's "setup_db.js" and likely dev, dropping is cleaner for schema sync.
        // However, to be safe, let's use ALTER commands or just Drop if it exists. 
        // User asked to "Add" fields. Let's try to Drop and Recreate to guarantee correct order/enums.

        console.log('⚠ Dropping old transactions table to apply new schema...');
        await promisePool.query('DROP TABLE IF EXISTS order_items'); // Drop child first
        await promisePool.query('DROP TABLE IF EXISTS transactions');

        const createTableQuery = `
            CREATE TABLE users (
                 id INT AUTO_INCREMENT PRIMARY KEY,
                 name VARCHAR(255) NOT NULL,
                 email VARCHAR(255) UNIQUE NOT NULL,
                 password VARCHAR(255) NOT NULL,
                 role ENUM('admin', 'customer') DEFAULT 'customer',
                 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;
        // Note: Users table likely exists, we just need transactions.

        const createTransactionQuery = `
            CREATE TABLE IF NOT EXISTS transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                txn_ref VARCHAR(255) UNIQUE NOT NULL,
                provider_ref VARCHAR(255),
                user_id INT,
                provider ENUM('PAYPAL', 'NETS', 'METAMASK') NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                status ENUM('PENDING', 'PAID', 'FAILED', 'TIMEOUT') DEFAULT 'PENDING',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;

        await promisePool.query(createTransactionQuery);

        console.log('⚠ Creating order_items table...');

        const createOrderItemsQuery = `
            CREATE TABLE IF NOT EXISTS order_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                transaction_id INT NOT NULL,
                product_id INT,
                product_name VARCHAR(255),
                price DECIMAL(10, 2),
                quantity INT,
                FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;

        await promisePool.query(createOrderItemsQuery);
        console.log('✅ Order Items table created.');


    } catch (error) {
        console.error('❌ Error updating transactions table:', error);
    } finally {
        process.exit();
    }
}

updateTransactionsTable();
