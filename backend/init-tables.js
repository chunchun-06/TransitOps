const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

const run = async () => {
    try {
        const schemaPath = path.join(__dirname, "src", "sql", "schema.sql");
        const schemaSql = fs.readFileSync(schemaPath, "utf8");

        await pool.query(schemaSql);

        console.log("Database schema initialized successfully");
    } catch (err) {
        console.error("Failed to initialize database:", err);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
};

run();