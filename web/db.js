import mysql from 'mysql2';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'shopify_subscription_app',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Export as a named export
export const db = pool.promise();
