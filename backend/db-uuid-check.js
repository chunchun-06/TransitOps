const pool = require('./src/config/db');

async function test() {
    try {
        console.log("Querying with empty string UUID...");
        const res = await pool.query('SELECT id FROM vehicles WHERE id = $1', ['']);
        console.log("Success! Rows:", res.rows);
    } catch (err) {
        console.error("FAILED WITH ERROR:", err.message);
    } finally {
        await pool.end();
    }
}
test();
