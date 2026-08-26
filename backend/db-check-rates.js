const pool = require('./src/config/db');

async function test() {
    try {
        const r = await pool.query(`
            SELECT tr.vehicle_category, tr.single_journey_rate, tp.name 
            FROM toll_rates tr 
            JOIN toll_plazas tp ON tr.toll_plaza_id = tp.id 
            WHERE tp.name IN ('Vijayamangalam Toll Plaza', 'Kaniyur Toll Plaza')
        `);
        console.log("Rates found:", r.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
test();
