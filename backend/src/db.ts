import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

// Configurações da Hostinger
const dbConfig = {
    host: '193.203.175.91',
    user: 'u785537399_6574',
    password: 'Gameroficial2*',
    database: 'u785537399_6574',
    port: 3306,
    ssl: {
        rejectUnauthorized: false
    }
};

const pool = mysql.createPool(dbConfig);

export async function initDb() {
    const connection = await pool.getConnection();
    try {
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) UNIQUE,
                password VARCHAR(255)
            )
        `);
        await connection.query(`
            CREATE TABLE IF NOT EXISTS tasks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                urgency VARCHAR(50), 
                status VARCHAR(50), 
                assigned_to INT,
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY(assigned_to) REFERENCES users(id),
                FOREIGN KEY(created_by) REFERENCES users(id)
            )
        `);
        await connection.query(`
            CREATE TABLE IF NOT EXISTS transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                type VARCHAR(50) NOT NULL,
                amount DOUBLE NOT NULL,
                description TEXT,
                date DATETIME NOT NULL,
                created_by INT,
                client_name VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(created_by) REFERENCES users(id)
            )
        `);
        await connection.query(`
            CREATE TABLE IF NOT EXISTS clients (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) UNIQUE,
                password VARCHAR(255),
                avatar_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await connection.query(`
            CREATE TABLE IF NOT EXISTS client_content (
                id INT AUTO_INCREMENT PRIMARY KEY,
                client_id INT,
                title VARCHAR(255),
                category VARCHAR(255),
                product VARCHAR(255),
                week_date VARCHAR(255),
                media_url TEXT,
                media_type VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(client_id) REFERENCES clients(id)
            )
        `);
        await connection.query(`
            CREATE TABLE IF NOT EXISTS demands (
                id INT AUTO_INCREMENT PRIMARY KEY,
                client_name VARCHAR(255) NOT NULL,
                total_videos INT NOT NULL,
                duration_seconds VARCHAR(255),
                has_material TINYINT(1) DEFAULT 0,
                material_link TEXT,
                description TEXT,
                assigned_videos INT DEFAULT 0,
                status VARCHAR(50) DEFAULT 'pending',
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(created_by) REFERENCES users(id)
            )
        `);

        const [rows]: any = await connection.query('SELECT COUNT(*) as count FROM users');
        if (rows[0].count === 0) {
            const hash = bcrypt.hashSync('admin123', 10);
            await connection.query('INSERT INTO users (username, password) VALUES (?, ?)', ['Turbalada', hash]);
            await connection.query('INSERT INTO users (username, password) VALUES (?, ?)', ['Floripa', hash]);
            await connection.query('INSERT INTO users (username, password) VALUES (?, ?)', ['Brenno', hash]);

            // Adicionar uma tarefa e transação de boas-vindas para o dashboard não bugar
            const [admin]: any = await connection.query('SELECT id FROM users LIMIT 1');
            const adminId = admin[0].id;

            await connection.query(`
                INSERT INTO tasks (title, description, urgency, status, assigned_to, created_by)
                VALUES ('Bem-vindo!', 'Seu sistema está operando 100% na Hostinger.', 'LOW', 'DONE', ?, ?)
            `, [adminId, adminId]);

            await connection.query(`
                INSERT INTO transactions (type, amount, description, date, created_by)
                VALUES ('INCOME', 1.0, 'Ativação do Sistema', NOW(), ?)
            `, [adminId]);

            console.log("Banco de dados Hostinger populado com sucesso.");
        }
    } catch (err) {
        console.error("Failed to seed initial users:", err);
    } finally {
        connection.release();
    }
}

export default pool;
