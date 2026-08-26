require('dotenv').config();
const pool = require('./src/config/db');

async function fix() {
    const client = await pool.connect();
    try {
        // Fix Kaniyur coords to route-verified position (NH 544, confirmed 7m from OSRM route)
        const r = await client.query(
            'UPDATE toll_plazas SET latitude = $1, longitude = $2 WHERE name = $3 RETURNING name, latitude, longitude',
            [11.0880, 77.1308, 'Kaniyur Toll Plaza']
        );
        console.log('Updated:', r.rows[0]);
    } finally {
        client.release();
        await pool.end();
    }
}
fix().catch(console.error);
