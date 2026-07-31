const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, 
    database: process.env.DB_NAME,
});

const run = async () => {
    try {
        const schemaPath = path.join(__dirname, 'src', 'sql', 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await pool.query(schemaSql);
        console.log("Database schema initialized successfully");
        process.exit(0);
    } catch (err) {
        console.error("Failed to initialize database:", err);
        process.exit(1);
    }
};
run();
