import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

/**
 * CONFIGURAÇÃO HOSTINGER (MySQL)
 * O host geralmente é 'localhost' se o backend estiver no mesmo servidor da Hostinger.
 */
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'u689348922_river',
    password: process.env.DB_PASSWORD || 'Gameroficial2*',
    database: process.env.DB_NAME || 'u689348922_river',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

export async function initDb() {
    console.log("--- [START] SETUP MYSQL (HOSTINGER) ---");
    try {
        const connection = await pool.getConnection();
        console.log("--- [CONECTADO] MySQL Hostinger pronto ---");
        connection.release();

        // Tabelas básicas (Sintaxe MySQL)
        await pool.query(`CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY, 
            username VARCHAR(255) UNIQUE, 
            password TEXT
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS tasks (
            id INT AUTO_INCREMENT PRIMARY KEY, 
            title TEXT, 
            description TEXT,
            status VARCHAR(50), 
            urgency VARCHAR(50),
            assigned_to INTEGER, 
            created_by INTEGER, 
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS transactions (
            id INT AUTO_INCREMENT PRIMARY KEY, 
            type VARCHAR(50), 
            amount FLOAT, 
            description TEXT, 
            client_name VARCHAR(255),
            date TIMESTAMP, 
            created_by INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS clients (
            id INT AUTO_INCREMENT PRIMARY KEY, 
            username VARCHAR(255) UNIQUE, 
            password TEXT, 
            password_raw TEXT, 
            niche TEXT, 
            avatar_url TEXT, 
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS demands (
            id INT AUTO_INCREMENT PRIMARY KEY,
            client_name VARCHAR(255),
            total_videos INT,
            assigned_videos INT DEFAULT 0,
            duration_seconds INT,
            has_material TINYINT(1),
            description TEXT,
            status VARCHAR(50) DEFAULT 'pending',
            created_by INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS demand_materials (
            id INT AUTO_INCREMENT PRIMARY KEY,
            demand_id INT,
            media_type VARCHAR(50),
            media_url TEXT,
            content TEXT,
            title TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS client_content (
            id INT AUTO_INCREMENT PRIMARY KEY,
            client_id INT,
            title VARCHAR(255),
            category VARCHAR(100),
            product VARCHAR(100),
            week_date VARCHAR(50),
            media_url TEXT,
            media_type VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS searches (
            id INT AUTO_INCREMENT PRIMARY KEY,
            query TEXT,
            count INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS leads (
            id INT AUTO_INCREMENT PRIMARY KEY,
            whatsapp VARCHAR(50) UNIQUE,
            name VARCHAR(255),
            phone VARCHAR(50),
            instagram VARCHAR(255),
            city VARCHAR(255),
            state VARCHAR(50),
            address TEXT,
            website TEXT,
            source TEXT,
            category VARCHAR(255),
            status VARCHAR(50) DEFAULT 'new',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS sent_messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            lead_id INT,
            status VARCHAR(50),
            message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        // RESET DE SEGURANÇA E ADMIN
        const hash = bcrypt.hashSync('admin123', 10);
        await pool.query('DELETE FROM users WHERE username IN (?, ?, ?)', ['Brenno', 'admin', 'turbalada']);
        await pool.query('DELETE FROM clients WHERE username = ?', ['turbalada']);
        await pool.query('INSERT INTO users (username, password) VALUES (?, ?), (?, ?)', ['Brenno', hash, 'admin', hash]);

        console.log("--- [OK] Banco MySQL Hostinger inicializado ---");

    } catch (err: any) {
        console.error("--- [ERRO CRÍTICO NO MYSQL] ---");
        console.error("MENSAGEM: " + err.message);
    }
}

export default pool;
