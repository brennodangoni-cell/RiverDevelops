import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

/**
 * MODO DE CONEXÃO: DIRETO (SESSION)
 * Vamos usar os dados oficiais do Supabase Project tctzbsjmuariwylrfbuy
 * Host Direto: db.tctzbsjmuariwylrfbuy.supabase.co
 */
const pool = new Pool({
    user: 'postgres',
    host: 'db.tctzbsjmuariwylrfbuy.supabase.co',
    database: 'postgres',
    password: 'Gameroficial2*',
    port: 5432,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
});

export async function initDb() {
    console.log("--- [START] VERIFICANDO BANCO SUPABASE ---");
    try {
        const res = await pool.query('SELECT NOW()');
        console.log("--- [OK] CONEXÃO SUPABASE ATIVA: " + res.rows[0].now);

        // Garantir tabelas
        const queries = [
            `CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username TEXT UNIQUE, password TEXT)`,
            `CREATE TABLE IF NOT EXISTS tasks (id SERIAL PRIMARY KEY, title TEXT, description TEXT, urgency TEXT, status TEXT, assigned_to INTEGER, created_by INTEGER, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
            `CREATE TABLE IF NOT EXISTS transactions (id SERIAL PRIMARY KEY, type TEXT, amount REAL, description TEXT, date TIMESTAMP, created_by INTEGER, client_name TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
            `CREATE TABLE IF NOT EXISTS clients (id SERIAL PRIMARY KEY, username TEXT UNIQUE, password TEXT, avatar_url TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
            `CREATE TABLE IF NOT EXISTS client_content (id SERIAL PRIMARY KEY, client_id INTEGER, title TEXT, category TEXT, product TEXT, media_url TEXT, media_type TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
            `CREATE TABLE IF NOT EXISTS demands (id SERIAL PRIMARY KEY, client_name TEXT, total_videos INTEGER, status TEXT DEFAULT 'pending', created_by INTEGER, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`
        ];

        for (const q of queries) {
            await pool.query(q);
        }

        // SEED: Garante que o Brenno exista com a senha certa
        const check = await pool.query('SELECT * FROM users WHERE username = $1', ['Brenno']);
        const hash = bcrypt.hashSync('admin123', 10);

        if (check.rows.length === 0) {
            await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', ['Brenno', hash]);
            await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', ['admin', hash]);
            console.log("--- [SEED] USUÁRIOS CRIADOS.");
        } else {
            // Atualiza a senha do Brenno de qualquer jeito para garantir que é admin123
            await pool.query('UPDATE users SET password = $1 WHERE username = $2', [hash, 'Brenno']);
            await pool.query('UPDATE users SET password = $1 WHERE username = $2', [hash, 'admin']);
            console.log("--- [SEED] SENHAS RESETADAS PARA ADMIN123.");
        }

    } catch (err: any) {
        console.error("--- [ERRO CRÍTICO DB] ---");
        console.error("MSG: " + err.message);
    }
}

export default pool;
