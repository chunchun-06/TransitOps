const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, 
    database: process.env.DB_NAME,
});

(async () => {
    try {
        await pool.query("SELECT NOW()");
        console.log("Database connected");
    } catch (err) {
        console.error("Database connection failed:", err.message);
    }
})();

module.exports = pool;