const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

pool.query("SELECT NOW()")
    .then((result) => {
        console.log("Database connected");
        console.log("Database time:", result.rows[0].now);
    })
    .catch((err) => {
        console.error("Database connection failed:", err.message);
    });

module.exports = pool;