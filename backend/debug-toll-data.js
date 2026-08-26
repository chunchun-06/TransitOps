require('dotenv').config();
const pool = require('./src/config/db');

async function debug() {
    const client = await pool.connect();
    try {
        // Check all plaza coordinates
        const plazas = await client.query('SELECT name, latitude, longitude FROM toll_plazas ORDER BY name');
        console.log('\n=== Toll Plaza Coordinates ===');
        for (const p of plazas.rows) {
            console.log(`  ${p.name}: (${p.latitude}, ${p.longitude})`);
        }

        // Check all rates for Kaniyur
        const rates = await client.query(`
            SELECT r.vehicle_category, r.journey_type, r.amount, r.effective_from, r.effective_until
            FROM toll_rates r
            JOIN toll_plazas p ON r.toll_plaza_id = p.id
            WHERE p.name LIKE '%Kaniyur%'
            ORDER BY r.vehicle_category, r.journey_type, r.effective_from
        `);
        console.log('\n=== Kaniyur Toll Rates ===');
        for (const r of rates.rows) {
            console.log(`  ${r.vehicle_category} | ${r.journey_type} | ₹${r.amount} | ${r.effective_from} → ${r.effective_until || 'open'}`);
        }

        // Check what date range we stored
        const vijRates = await client.query(`
            SELECT r.vehicle_category, r.journey_type, r.amount, r.effective_from, r.effective_until
            FROM toll_rates r
            JOIN toll_plazas p ON r.toll_plaza_id = p.id
            WHERE p.name LIKE '%Vijayamangalam%' AND r.vehicle_category = 'LCV'
            ORDER BY r.journey_type, r.effective_from
        `);
        console.log('\n=== Vijayamangalam LCV Rates ===');
        for (const r of vijRates.rows) {
            console.log(`  ${r.journey_type} | ₹${r.amount} | ${r.effective_from} → ${r.effective_until || 'open'}`);
        }

    } finally {
        client.release();
        await pool.end();
    }
}
debug().catch(console.error);
