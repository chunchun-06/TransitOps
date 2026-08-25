const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'transitops'
});

async function main() {
    try {
        const tablesRes = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log("=== ALL POSTGRESQL TABLES ===");
        for (let r of tablesRes.rows) {
            const table = r.table_name;
            const countRes = await pool.query(`SELECT COUNT(*) FROM "${table}"`);
            const colsRes = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${table}' ORDER BY ordinal_position`);
            console.log(`\nTable: [${table}] (Rows: ${countRes.rows[0].count})`);
            colsRes.rows.forEach(col => console.log(`  - ${col.column_name}: ${col.data_type}`));
        }
    } catch (err) {
        console.error("Schema check error:", err);
    } finally {
        pool.end();
    }
}

main();
