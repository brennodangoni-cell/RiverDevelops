const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'postgresql://postgres:Gameroficial2%2A@db.tctzbsjmuariwylrfbuy.supabase.co:5432/postgres';

async function extractSupabaseData() {
    const client = new Client({
        connectionString: SUPABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    const dumpDir = path.join(__dirname, 'supabase_backup');
    if (!fs.existsSync(dumpDir)) fs.mkdirSync(dumpDir);

    try {
        await client.connect();

        const tables = [
            'users',
            'clients',
            'leads',
            'transactions',
            'tasks',
            'client_content',
            'demands',
            'demand_materials',
            'searches',
            'sent_messages'
        ];

        console.log("Iniciando backup do Supabase...");

        for (let table of tables) {
            console.log(`Extraindo dados da tabela: ${table}...`);
            try {
                const res = await client.query(`SELECT * FROM "${table}"`);
                const filePath = path.join(dumpDir, `${table}.json`);
                fs.writeFileSync(filePath, JSON.stringify(res.rows, null, 2));
                console.log(`✅ ${res.rows.length} registros salvos em ${table}.json`);
            } catch (err) {
                console.error(`❌ Erro ao extrair ${table}:`, err.message);
            }
        }

        console.log("\nBackup concluído com sucesso. Dados salvos na pasta 'supabase_backup'.");

    } catch (e) {
        console.error('Erro de conexão:', e.message);
    } finally {
        try { await client.end(); } catch (ignored) { }
    }
}

extractSupabaseData();
