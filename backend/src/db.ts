import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

// String de conexão para o Supavisor (Porta 6543 - Transaction Mode)
// O '*' na senha DEVE ser codificado como '%2A' para o pooler funcionar no Render
const connectionString = 'postgresql://postgres.tctzbsjmuariwylrfbuy:Gameroficial2%2A@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

export async function initDb() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE,
            password TEXT
        )
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS tasks (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            urgency TEXT, 
            status TEXT, 
            assigned_to INTEGER,
            created_by INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(assigned_to) REFERENCES users(id),
            FOREIGN KEY(created_by) REFERENCES users(id)
        )
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS transactions (
            id SERIAL PRIMARY KEY,
            type TEXT NOT NULL,
            amount REAL NOT NULL,
            description TEXT,
            date TIMESTAMP NOT NULL,
            created_by INTEGER,
            client_name TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(created_by) REFERENCES users(id)
        )
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS clients (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE,
            password TEXT,
            avatar_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS client_content (
            id SERIAL PRIMARY KEY,
            client_id INTEGER,
            title TEXT,
            category TEXT,
            product TEXT,
            week_date TEXT,
            media_url TEXT,
            media_type TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(client_id) REFERENCES clients(id)
        )
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS demands (
            id SERIAL PRIMARY KEY,
            client_name TEXT NOT NULL,
            total_videos INTEGER NOT NULL,
            duration_seconds TEXT,
            has_material INTEGER DEFAULT 0,
            material_link TEXT,
            description TEXT,
            assigned_videos INTEGER DEFAULT 0,
            status TEXT DEFAULT 'pending',
            created_by INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(created_by) REFERENCES users(id)
        )
    `);

    try {
        const usersRes = await pool.query('SELECT COUNT(*) as count FROM users');
        if (parseInt(usersRes.rows[0].count) === 0) {
            // Seed initial users
            const hash = bcrypt.hashSync('admin123', 10);
            await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', ['Turbalada', hash]);
            await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', ['Floripa', hash]);
            await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', ['Brenno', hash]);
            console.log("Banco de dados populado com admins iniciais.");
        }
    } catch (err) {
        console.error("Failed to seed initial users:", err);
    }
}

export default pool;
