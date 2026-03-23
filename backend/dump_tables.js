const { Client } = require('pg');

async function getTables() {
    const client = new Client({
        connectionString: 'postgresql://postgres:Gameroficial2%2A@db.tctzbsjmuariwylrfbuy.supabase.co:5432/postgres',
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();
        const res = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`);
        console.log("Tables in public schema:");
        for (let row of res.rows) {
            console.log(row.table_name);
            const dataRes = await client.query(`SELECT * FROM "${row.table_name}" LIMIT 2`);
            console.log(`-- ${row.table_name} sample:`, JSON.stringify(dataRes.rows));
        }
    } catch (e) {
        console.error('Error DB host 5432:', e.message);
    } finally {
        try { await client.end(); } catch (ignored) { }
    }
}
getTables();
