require('dotenv').config();
const pool = require('./src/config/db');

function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function minDistFromPolyline(pLat, pLng, polyline) {
    let minKm = Infinity;
    for (let i = 0; i < polyline.length - 1; i++) {
        const a = polyline[i], b = polyline[i+1];
        const dx = b[1]-a[1], dy = b[0]-a[0];
        const lenSq = dx*dx + dy*dy;
        let pj = a[0], pjl = a[1];
        if (lenSq > 0) { let t = ((pLng-a[1])*dx + (pLat-a[0])*dy) / lenSq; t = Math.max(0, Math.min(1, t)); pj = a[0]+t*dy; pjl = a[1]+t*dx; }
        const d = haversineDistance(pLat, pLng, pj, pjl);
        if (d < minKm) minKm = d;
    }
    return minKm;
}

async function run() {
    const client = await pool.connect();
    try {
        const url = 'https://router.project-osrm.org/route/v1/driving/77.5830,11.2740;76.9558,11.0168?overview=full&geometries=geojson';
        const res = await fetch(url);
        const data = await res.json();
        const polyline = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
        console.log(`Route has ${polyline.length} waypoints`);

        const plazas = await client.query('SELECT name, latitude, longitude FROM toll_plazas');
        for (const p of plazas.rows) {
            const minKm = minDistFromPolyline(parseFloat(p.latitude), parseFloat(p.longitude), polyline);
            const marker = minKm <= 0.3 ? '✅' : minKm <= 0.6 ? '⚠️ (within 600m)' : '❌';
            console.log(`  ${marker} ${p.name}: ${(minKm*1000).toFixed(0)}m from route`);
        }
    } finally {
        client.release();
        await pool.end();
    }
}
run().catch(console.error);
