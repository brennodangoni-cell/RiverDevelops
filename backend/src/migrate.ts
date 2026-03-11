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

        // Backfill: extrair cidade/estado do campo source para leads antigos
        // source tem formato "Categoria em Cidade, UF"
        const { rows: emptyLeads } = await pool.query(`
            SELECT id, source FROM leads WHERE city IS NULL AND source IS NOT NULL AND source LIKE '%em %'
        `);
        for (const lead of emptyLeads) {
            const afterEm = lead.source.split(' em ').slice(1).join(' em ').trim();
            if (afterEm) {
                const parts = afterEm.split(',').map((s: string) => s.trim());
                const city = parts[0] || null;
                const state = parts[1] || null;
                if (city) {
                    await pool.query(`UPDATE leads SET city = $1, state = $2 WHERE id = $3`, [city, state, lead.id]);
                }
            }
        }
        if (emptyLeads.length > 0) {
            console.log(`[migrate] Backfill: ${emptyLeads.length} leads atualizados com cidade/estado.`);
        }
    } catch (e: any) {
        console.warn('[migrate] Erro (pode ignorar se coluna já existe):', e.message);
    } finally {
        await pool.end();
    }
}
