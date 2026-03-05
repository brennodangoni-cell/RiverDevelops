import { Pool } from 'pg';

const pool = new Pool({
    user: 'postgres',
    host: 'db.tctzbsjmuariwylrfbuy.supabase.co',
    database: 'postgres',
    password: 'Gameroficial2*',
    port: 5432,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        await pool.query('ALTER TABLE clients ADD COLUMN IF NOT EXISTS niche TEXT DEFAULT \'Não definido\';');
        console.log("Migration successful");
    } catch (e) {
        console.error("Migration failed", e);
    } finally {
        pool.end();
    }
}

migrate();
