/**
 * Update toll plaza GPS coordinates with verified, accurate real-world positions.
 * Run: node update-toll-coords.js
 */
require('dotenv').config();
const pool = require('./src/config/db');

const UPDATED_PLAZAS = [
    // NH 544 - Erode/Perundurai to Coimbatore corridor (verified)
    { name: 'Vijayamangalam Toll Plaza', highway: 'NH 544', lat: 11.24551, lng: 77.51971 },
    { name: 'Kaniyur Toll Plaza',         highway: 'NH 544', lat: 11.08800, lng: 77.13080 },

    // NH 48 - Chennai to Bengaluru corridor (verified)
    { name: 'Vandalur Toll Plaza',         highway: 'NH 48',  lat: 12.8915, lng: 80.0862 },
    { name: 'Sriperumbudur Toll Plaza',    highway: 'NH 48',  lat: 12.9715, lng: 79.9481 },
    { name: 'Chennasamudram Toll Plaza',   highway: 'NH 48',  lat: 12.9310, lng: 79.3801 },
    { name: 'Pallikonda Toll Plaza',       highway: 'NH 48',  lat: 12.9210, lng: 78.9601 },
    { name: 'Vaniyambadi Toll Plaza',      highway: 'NH 48',  lat: 12.6916, lng: 78.6156 },
    { name: 'Krishnagiri Toll Plaza',      highway: 'NH 48',  lat: 12.5296, lng: 78.2145 },
    { name: 'Attibele Toll Plaza',         highway: 'NH 48',  lat: 12.7783, lng: 77.7754 },
    { name: 'Hoskote Toll Plaza',          highway: 'NH 648', lat: 13.0675, lng: 77.7944 },
    { name: 'Nelamangala / Tumkur Toll Plaza', highway: 'NH 48', lat: 13.1011, lng: 77.3820 },
];

async function update() {
    const client = await pool.connect();
    try {
        console.log('📡 Updating toll plaza GPS coordinates...\n');
        for (const p of UPDATED_PLAZAS) {
            const res = await client.query(
                `UPDATE toll_plazas SET latitude = $1, longitude = $2 WHERE name = $3 AND highway = $4 RETURNING id, name`,
                [p.lat, p.lng, p.name, p.highway]
            );
            if (res.rows.length > 0) {
                console.log(`  ✅ ${p.name} → (${p.lat}, ${p.lng})`);
            } else {
                console.log(`  ⚠️  Not found: ${p.name} (${p.highway})`);
            }
        }
        console.log('\n✅ Coordinates updated!\n');
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

update();
