import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import dns from 'dns';

// Forçar IPv4 para o Render
dns.setDefaultResultOrder('ipv4first');
dotenv.config();

// Configuração Supavisor (Pooler IPv4)
const pool = new Pool({
    user: 'postgres.tctzbsjmuariwylrfbuy',
    host: 'aws-0-sa-east-1.pooler.supabase.com',
    database: 'postgres',
    password: 'Gameroficial2*',
    port: 5432, // Session Mode (mais estável)
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
});

export async function initDb() {
    const queries = [
        `CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE,
            password TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS tasks (
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
        )`,
        `CREATE TABLE IF NOT EXISTS transactions (
            id SERIAL PRIMARY KEY,
            type TEXT NOT NULL,
            amount REAL NOT NULL,
            description TEXT,
            date TIMESTAMP NOT NULL,
            created_by INTEGER,
            client_name TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(created_by) REFERENCES users(id)
        )`,
        `CREATE TABLE IF NOT EXISTS clients (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE,
            password TEXT,
            avatar_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS client_content (
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
        )`,
        `CREATE TABLE IF NOT EXISTS demands (
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
        )`
    ];

    for (const q of queries) {
        try {
            await pool.query(q);
        } catch (e: any) {
            console.error(`Erro ao criar tabela: ${e.message}`);
        }
    }

    try {
        const usersRes = await pool.query('SELECT COUNT(*) as count FROM users');
        if (parseInt(usersRes.rows[0].count) === 0) {
            const hash = bcrypt.hashSync('admin123', 10);
            await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', ['Turbalada', hash]);
            await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', ['Floripa', hash]);
            await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', ['Brenno', hash]);

            const adminIdRes = await pool.query('SELECT id FROM users LIMIT 1');
            const adminId = adminIdRes.rows[0].id;

            await pool.query(`
                INSERT INTO tasks (title, description, urgency, status, assigned_to, created_by)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, ['Bem-vindo!', 'Sistema conectado ao Supabase via IPv4 Pooler.', 'LOW', 'DONE', adminId, adminId]);

            console.log("Banco de dados Supabase inicializado.");
        }
    } catch (err: any) {
        console.error("Erro no Seed do Supabase:", err.message);
    }
}

export default pool;
