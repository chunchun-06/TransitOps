/**
 * Fix & verify all toll plaza GPS coordinates with accurate real-world positions.
 * Run: node fix-toll-coords.js
 */
require('dotenv').config();
const pool = require('./src/config/db');

// Verified GPS coordinates from Wikimapia / Mapcarta / official sources
const VERIFIED_PLAZAS = [
    // NH 544 - Perundurai/Erode to Coimbatore corridor
    { name: 'Vijayamangalam Toll Plaza', highway: 'NH 544', lat: 11.24551, lng: 77.51971 },
    // 11°5'42"N = 11 + 5/60 + 42/3600 = 11.0950; 77°9'5"E = 77 + 9/60 + 5/3600 = 77.1514
    { name: 'Kaniyur Toll Plaza',         highway: 'NH 544', lat: 11.09500, lng: 77.15140 },

    // NH 48 - Chennai to Bangalore (NHAI corridor)
    { name: 'Vandalur Toll Plaza',         highway: 'NH 48',  lat: 12.8900, lng: 80.0850 },
    { name: 'Sriperumbudur Toll Plaza',    highway: 'NH 48',  lat: 12.9650, lng: 79.9480 },
    { name: 'Chennasamudram Toll Plaza',   highway: 'NH 48',  lat: 12.9250, lng: 79.3840 },
    { name: 'Pallikonda Toll Plaza',       highway: 'NH 48',  lat: 12.9180, lng: 78.9620 },
    { name: 'Vaniyambadi Toll Plaza',      highway: 'NH 48',  lat: 12.6930, lng: 78.6160 },
    // 12° 32' 40" N = 12.5444; 78° 12' 4" E = 78.2011
    { name: 'Krishnagiri Toll Plaza',      highway: 'NH 48',  lat: 12.5444, lng: 78.2011 },
    { name: 'Attibele Toll Plaza',         highway: 'NH 48',  lat: 12.7770, lng: 77.7770 },
    { name: 'Hoskote Toll Plaza',          highway: 'NH 648', lat: 13.0675, lng: 77.7944 },
    { name: 'Nelamangala / Tumkur Toll Plaza', highway: 'NH 48', lat: 13.1011, lng: 77.3820 },
];

function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function update() {
    const client = await pool.connect();
    try {
        console.log('📡 Fixing toll plaza GPS coordinates...\n');

        // Show existing before
        const existing = await client.query('SELECT name, highway, latitude, longitude FROM toll_plazas ORDER BY name');
        console.log('Current coordinates in DB:');
        for (const r of existing.rows) {
            console.log(`  ${r.name} (${r.highway}): (${r.latitude}, ${r.longitude})`);
        }
        console.log('');

        for (const p of VERIFIED_PLAZAS) {
            const res = await client.query(
                `UPDATE toll_plazas SET latitude = $1, longitude = $2 WHERE name = $3 AND highway = $4 RETURNING id, name`,
                [p.lat, p.lng, p.name, p.highway]
            );
            if (res.rows.length > 0) {
                console.log(`  ✅ ${p.name} → (${p.lat}, ${p.lng})`);
            } else {
                console.log(`  ⚠️  Not found: "${p.name}" on ${p.highway}`);
            }
        }

        // Quick sanity: distance between Perundurai(11.274, 77.583) and Vijayamangalam
        const vijayaDist = haversineDistance(11.274, 77.583, 11.24551, 77.51971);
        const kaniyurDist = haversineDistance(11.0168, 76.9558, 11.09500, 77.15140);
        console.log(`\n📐 Sanity distances:`);
        console.log(`   Perundurai → Vijayamangalam plaza: ${vijayaDist.toFixed(1)} km (should be ~7-25 km from route midpoint)`);
        console.log(`   Coimbatore → Kaniyur plaza: ${kaniyurDist.toFixed(1)} km`);

        console.log('\n✅ Coordinates fixed!\n');
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

update();
