const fs = require('fs');
const path = require('path');

const dumpDir = path.join(__dirname, 'supabase_backup');
const outputFile = path.join(__dirname, 'migration_hostinger.sql');

if (!fs.existsSync(dumpDir)) {
    console.error("Pasta supabase_backup não encontrada.");
    process.exit(1);
}

let sqlContent = `-- Script de migração do Supabase para MySQL (Hostinger)\n`;
sqlContent += `-- Rode isso no phpMyAdmin da Hostinger, na aba "SQL"\n\n`;

// Helper para escapar strings no MySQL
function escapeString(str) {
    if (str === null || str === undefined) return 'NULL';
    str = str.toString().replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
        switch (char) {
            case "\0": return "\\0";
            case "\x08": return "\\b";
            case "\x09": return "\\t";
            case "\x1a": return "\\z";
            case "\n": return "\\n";
            case "\r": return "\\r";
            case "\"": case "'": case "\\": case "%": return "\\" + char;
        }
    });
    return `'${str}'`;
}

// Helper para formatar data (MySQL timestamp)
function formatDate(dateString) {
    if (!dateString) return 'NULL';
    const d = new Date(dateString);
    if (isNaN(d)) return 'NULL';
    return `'${d.toISOString().slice(0, 19).replace('T', ' ')}'`;
}

// Converte JSON de cada arquivo
const tables = [
    { name: 'users', file: 'users.json' },
    { name: 'clients', file: 'clients.json' },
    { name: 'leads', file: 'leads.json' },
    { name: 'searches', file: 'searches.json' },
    { name: 'transactions', file: 'transactions.json' }
];

for (let table of tables) {
    const filePath = path.join(dumpDir, table.file);
    if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (data.length > 0) {
            sqlContent += `\n-- Restaurando dados da tabela: ${table.name}\n`;

            for (let row of data) {
                const keys = Object.keys(row);
                // Mapear colunas e valores. Garantir que as aspas não quebrem o INSERT
                const cols = keys.map(k => `\`${k}\``).join(', ');
                const vals = keys.map(k => {
                    const val = row[k];
                    if (val === null) return 'NULL';
                    if (k === 'created_at' || k === 'date') return formatDate(val);
                    if (typeof val === 'number') return val;
                    if (typeof val === 'boolean') return val ? 1 : 0;
                    return escapeString(val);
                }).join(', ');

                // Ignorar erros caso já exista:
                sqlContent += `INSERT IGNORE INTO \`${table.name}\` (${cols}) VALUES (${vals});\n`;
            }
        }
    }
}

fs.writeFileSync(outputFile, sqlContent, 'utf8');
console.log(`✅ Arquivo SQL gerado: ${outputFile}`);
