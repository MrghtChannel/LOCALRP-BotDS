const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const createTable = () => {
    pool.query(`
        CREATE TABLE IF NOT EXISTS messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            text TEXT NOT NULL,
            channel_id VARCHAR(255) NOT NULL,
            role_id VARCHAR(255),
            image_url VARCHAR(512),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `, (err, results) => {
        if (err) {
            console.error('Помилка створення таблиці:', err);
        } else {
            console.log('Таблиця messages перевірена/створена');
        }
    });
};

createTable();

const saveToDatabase = (title, text, channelId, roleId, imageUrl) => {
    pool.query(
        'INSERT INTO messages (title, text, channel_id, role_id, image_url, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [title, text, channelId, roleId, imageUrl],
        (err, results) => {
            if (err) {
                console.error('Помилка збереження в БД:', err);
            } else {
                console.log('Дані успішно збережено в БД:', results.insertId);
            }
        }
    );
};

module.exports = { saveToDatabase };
