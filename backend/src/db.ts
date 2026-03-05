import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import dns from 'dns';

// Forçar IPv4 para o Render
dns.setDefaultResultOrder('ipv4first');
dotenv.config();

/**
 * CONEXÃO DIRETA (Sem passar pelo Pooler do Supabase)
 * Isso evita o erro "Tenant not found"
 */
const pool = new Pool({
    user: 'postgres',
    host: 'db.tctzbsjmuariwylrfbuy.supabase.co',
    database: 'postgres',
    password: 'Gameroficial2*',
    port: 5432,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
});

export async function initDb() {
    console.log("--- [DEBUG] INICIANDO SETUP DIRETO SUPABASE ---");
    try {
        // 1. Verificar conexão básica
        const now = await pool.query('SELECT NOW()');
        console.log("--- [DEBUG] CONEXÃO ESTABELECIDA EM: " + now.rows[0].now);

        // 2. Garantir Tabelas
        await pool.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username TEXT UNIQUE, password TEXT)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS tasks (id SERIAL PRIMARY KEY, title TEXT, description TEXT, urgency TEXT, status TEXT, assigned_to INTEGER, created_by INTEGER, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS transactions (id SERIAL PRIMARY KEY, type TEXT, amount REAL, description TEXT, date TIMESTAMP, created_by INTEGER, client_name TEXT)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS clients (id SERIAL PRIMARY KEY, username TEXT UNIQUE, password TEXT, avatar_url TEXT)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS client_content (id SERIAL PRIMARY KEY, client_id INTEGER, title TEXT, category TEXT, product TEXT, media_url TEXT, media_type TEXT)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS demands (id SERIAL PRIMARY KEY, client_name TEXT, total_videos INTEGER, status TEXT DEFAULT 'pending', created_by INTEGER)`);

        console.log("--- [DEBUG] TABELAS PRONTAS.");

        // 3. SEED FORÇADO (Limpa e Re-cria o Brenno)
        const hash = bcrypt.hashSync('admin123', 10);
        await pool.query('DELETE FROM users WHERE username = $1', ['Brenno']);
        await pool.query('DELETE FROM users WHERE username = $1', ['admin']);

        await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', ['Brenno', hash]);
        await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', ['admin', hash]);

        console.log("--- [DEBUG] USUÁRIOS 'Brenno' E 'admin' CRIADOS NO SUPABASE.");

    } catch (err: any) {
        console.error("!!! [ERRO-DB] !!!");
        console.error("MENSAGEM: ", err.message);
        console.error("CÓDIGO: ", err.code);
    }
}

export default pool;
