const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Lê as configurações do DB da env ou usa os padrões do Hostinger/XAMPP
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'u689348922_river',
    password: process.env.DB_PASSWORD || 'Gameroficial2*',
    database: process.env.DB_NAME || 'u689348922_river',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function restoreToMysql() {
    const dumpDir = path.join(__dirname, 'supabase_backup');
    if (!fs.existsSync(dumpDir)) {
        console.error("❌ Pasta 'supabase_backup' não encontrada.");
        return;
    }

    try {
        console.log("Conectando ao banco de dados MySQL...");
        const connection = await pool.getConnection();
        console.log("✅ Conexão estabelecida com sucesso.");

        // Restaura 'clients'
        const clientsFile = path.join(dumpDir, 'clients.json');
        if (fs.existsSync(clientsFile)) {
            const clients = JSON.parse(fs.readFileSync(clientsFile, 'utf8'));
            console.log(`Restaurando ${clients.length} clientes...`);
            for (let c of clients) {
                try {
                    await connection.query(
                        `INSERT INTO clients (id, username, password, password_raw, niche, avatar_url, created_at) 
                         VALUES (?, ?, ?, ?, ?, ?, ?)
                         ON DUPLICATE KEY UPDATE username=username`,
                        [c.id, c.username, c.password, c.password_raw, c.niche, c.avatar_url, c.created_at || new Date()]
                    );
                } catch (err) {
                    console.error(`Erro ao inserir cliente ${c.username}:`, err.message);
                }
            }
        }

        // Restaura 'leads'
        const leadsFile = path.join(dumpDir, 'leads.json');
        if (fs.existsSync(leadsFile)) {
            const leads = JSON.parse(fs.readFileSync(leadsFile, 'utf8'));
            console.log(`Restaurando ${leads.length} leads...`);
            for (let l of leads) {
                try {
                    await connection.query(
                        `INSERT INTO leads (id, whatsapp, name, phone, instagram, city, state, address, website, source, category, status, created_at) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                         ON DUPLICATE KEY UPDATE whatsapp=whatsapp`,
                        [l.id, l.whatsapp, l.name, l.phone, l.instagram, l.city, l.state, l.address, l.website, l.source, l.category, l.status, l.created_at || new Date()]
                    );
                } catch (err) {
                    // Ignore duplicate whatsapp errors quietly
                }
            }
        }

        // Restaura 'searches'
        const searchesFile = path.join(dumpDir, 'searches.json');
        if (fs.existsSync(searchesFile)) {
            const searches = JSON.parse(fs.readFileSync(searchesFile, 'utf8'));
            console.log(`Restaurando ${searches.length} buscas...`);
            for (let s of searches) {
                try {
                    await connection.query(
                        `INSERT IGNORE INTO searches (id, query, count, created_at) VALUES (?, ?, ?, ?)`,
                        [s.id, s.query, s.count, s.created_at || new Date()]
                    );
                } catch (err) { }
            }
        }

        // Restaura 'transactions'
        const txFile = path.join(dumpDir, 'transactions.json');
        if (fs.existsSync(txFile)) {
            const txs = JSON.parse(fs.readFileSync(txFile, 'utf8'));
            console.log(`Restaurando ${txs.length} transações...`);
            for (let t of txs) {
                try {
                    await connection.query(
                        `INSERT IGNORE INTO transactions (id, type, amount, description, client_name, date, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [t.id, t.type, t.amount, t.description, t.client_name, t.date, t.created_by, t.created_at || new Date()]
                    );
                } catch (err) { }
            }
        }

        connection.release();
        console.log("✅ Restauração finalizada! Dados migrados para o MySQL.");
    } catch (e) {
        console.error("❌ Falha crítica ao restaurar para o MySQL:", e.message);
    } finally {
        process.exit();
    }
}

restoreToMysql();
