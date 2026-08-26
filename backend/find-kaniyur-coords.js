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

// Route passes through ~(11.088, 77.130) area — try coordinates on the actual road
const CANDIDATES = [
    { lat: 11.0880, lng: 77.1308, label: 'On route waypoint A' },
    { lat: 11.0870, lng: 77.1295, label: 'On route waypoint B' },
    { lat: 11.0860, lng: 77.1275, label: 'On route waypoint C' },
    { lat: 11.0850, lng: 77.1260, label: 'On route waypoint D' },
    { lat: 11.0840, lng: 77.1248, label: 'On route waypoint E' },
    { lat: 11.0900, lng: 77.1340, label: 'On route waypoint F' },
    { lat: 11.0910, lng: 77.1392, label: 'On route waypoint G (first in area)' },
];

async function run() {
    const url = 'https://router.project-osrm.org/route/v1/driving/77.5830,11.2740;76.9558,11.0168?overview=full&geometries=geojson';
    const res = await fetch(url);
    const data = await res.json();
    const polyline = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
    console.log(`Route: ${polyline.length} waypoints\n--- Candidate distances from route ---`);

    for (const c of CANDIDATES) {
        const km = minDistFromPolyline(c.lat, c.lng, polyline);
        const ok = km <= 0.3 ? '✅' : '❌';
        console.log(`${ok} ${c.label} (${c.lat}, ${c.lng}): ${(km*1000).toFixed(0)}m`);
    }
    await pool.end();
}
run().catch(console.error);
