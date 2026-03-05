const { Pool } = require('pg');

async function test(connStr, label) {
    const pool = new Pool({
        user: 'postgres.tctzbsjmuariwylrfbuy',
        host: 'aws-0-sa-east-1.pooler.supabase.com',
        database: 'postgres',
        password: 'Gameroficial2*',
        port: 6543,
        ssl: { rejectUnauthorized: false }
    });
    try {
        console.log(`Testing ${label}...`);
        const res = await pool.query('SELECT NOW()');
        console.log(`- ${label} SUCCESS!`, res.rows[0]);
        await pool.end();
        return true;
    } catch (err) {
        console.error(`- ${label} FAILED:`, err.message);
        await pool.end();
        return false;
    }
}

async function run() {
    // Attempt 1: Pooler Transaction Mode
    await test(
        'postgresql://postgres.tctzbsjmuariwylrfbuy:Gameroficial2%2A@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require',
        'Pooler Transaction (6543)'
    );

    // Attempt 2: Pooler Session Mode
    await test(
        'postgresql://postgres.tctzbsjmuariwylrfbuy:Gameroficial2%2A@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require',
        'Pooler Session (5432)'
    );

    // Attempt 3: Maybe the project ref is separate?
    // Some older poolers used different formats. 
}

run();
