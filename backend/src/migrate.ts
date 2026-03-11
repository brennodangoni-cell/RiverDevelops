import { Pool } from 'pg';

/**
 * Migrações automáticas no startup.
 * Requer DATABASE_URL no .env (Supabase: Dashboard > Connect > Connection string).
 */
export async function runMigrations(): Promise<void> {
    const url = process.env.DATABASE_URL;
    if (!url) {
        console.log('[migrate] DATABASE_URL não definido, pulando migrações.');
        return;
    }

    const pool = new Pool({
        connectionString: url,
        ssl: { rejectUnauthorized: false },
    });

    try {
        await pool.query(`
            ALTER TABLE clients ADD COLUMN IF NOT EXISTS password_raw TEXT;
        `);
        console.log('[migrate] Coluna password_raw verificada/criada.');

        // Lead Machine: adicionar colunas de localização
        await pool.query(`
            ALTER TABLE leads ADD COLUMN IF NOT EXISTS city TEXT;
            ALTER TABLE leads ADD COLUMN IF NOT EXISTS state TEXT;
            ALTER TABLE leads ADD COLUMN IF NOT EXISTS address TEXT;
            ALTER TABLE leads ADD COLUMN IF NOT EXISTS website TEXT;
        `);
        console.log('[migrate] Colunas de localização em leads verificadas/criadas.');
    } catch (e: any) {
        console.warn('[migrate] Erro (pode ignorar se coluna já existe):', e.message);
    } finally {
        await pool.end();
    }
}
