import { Pool } from 'pg';

const testPools = [
    'aws-0-us-east-1.pooler.supabase.com',
    'aws-0-sa-east-1.pooler.supabase.com'
];

async function test() {
    for (const host of testPools) {
        console.log(`Testing ${host}...`);
        const pool = new Pool({
            user: 'postgres.tctzbsjmuariwylrfbuy',
            host: host,
            database: 'postgres',
            password: 'Gameroficial2*',
            port: 6543,
            ssl: { rejectUnauthorized: false }
        });

        try {
            const res = await pool.query('SELECT NOW()');
            console.log(`✅ SUCCESS on ${host}: ${res.rows[0].now}`);
            pool.end();
        } catch (e: any) {
            console.log(`❌ ERROR on ${host}: ${e.message}`);
        }
    }
}

test();
