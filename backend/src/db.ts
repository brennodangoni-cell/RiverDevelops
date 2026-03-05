import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import dns from 'dns';

// OBRIGATÓRIO: Forçar IPv4 no nível do sistema para evitar ENETUNREACH no Render
dns.setDefaultResultOrder('ipv4first');
dotenv.config();

/**
 * CONFIGURAÇÃO SUPAVISOR (IPv4 Pooler)
 * Usando o modo Session (porta 5432) que é o mais compatível com Render
 */
const pool = new Pool({
    user: 'postgres.tctzbsjmuariwylrfbuy', // ID do projeto incluído
    host: 'aws-0-sa-east-1.pooler.supabase.com',
    database: 'postgres',
    password: 'Gameroficial2*', // Senha pura no objeto
    port: 5432,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 20000,
});

export async function initDb() {
    console.log("--- [START] SETUP SUPABASE (MODO IPV4 POOLER) ---");
    try {
        const res = await pool.query('SELECT NOW()');
        console.log("--- [CONECTADO] Supabase respondeu em: " + res.rows[0].now);

        // Tabelas básicas
        await pool.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username TEXT UNIQUE, password TEXT)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS tasks (id SERIAL PRIMARY KEY, title TEXT, status TEXT, assigned_to INTEGER, created_by INTEGER, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS transactions (id SERIAL PRIMARY KEY, type TEXT, amount REAL, description TEXT, date TIMESTAMP, created_by INTEGER)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS clients (id SERIAL PRIMARY KEY, username TEXT UNIQUE, password TEXT)`);

        // RESET DE SENHA ADMIN (FORÇA BRUTA)
        const hash = bcrypt.hashSync('admin123', 10);
        await pool.query('DELETE FROM users WHERE username = $1', ['Brenno']);
        await pool.query('DELETE FROM users WHERE username = $1', ['admin']);
        await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', ['Brenno', hash]);
        await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', ['admin', hash]);

        console.log("--- [OK] Usuários Brenno e admin prontos com senha 'admin123' ---");

    } catch (err: any) {
        console.error("--- [ERRO CRÍTICO NO BANCO] ---");
        console.error("MENSAGEM: " + err.message);
        console.error("DICA: Verifique se o Pooler no Supabase está habilitado.");
    }
}

export default pool;
