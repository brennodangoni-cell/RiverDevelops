import pool from './src/db';

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
