/**
 * Debug: Print OSRM route points near Kaniyur to find the correct coordinates.
 */
require('dotenv').config();

async function debugRoute() {
    const latS = 11.2740, lngS = 77.5830;
    const latD = 11.0168, lngD = 76.9558;

    const url = `https://router.project-osrm.org/route/v1/driving/${lngS},${latS};${lngD},${latD}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);

    console.log(`Route has ${coords.length} points from Perundurai to Coimbatore`);
    console.log(`Route start: ${coords[0]}`);
    console.log(`Route end: ${coords[coords.length-1]}`);

    // Print every 50th point to see route trajectory
    console.log('\nKey waypoints along route:');
    for (let i = 0; i < coords.length; i += 100) {
        console.log(`  [${i}] lat=${coords[i][0].toFixed(5)}, lng=${coords[i][1].toFixed(5)}`);
    }

    // Check closest point to Kaniyur toll (11.095, 77.1514)
    const kLat = 11.095, kLng = 77.1514;
    let minDist = Infinity, minIdx = -1;
    for (let i = 0; i < coords.length; i++) {
        const dLat = (coords[i][0] - kLat) * Math.PI/180;
        const dLng = (coords[i][1] - kLng) * Math.PI/180;
        const d = Math.sqrt(dLat*dLat + dLng*dLng) * 111; // approx km
        if (d < minDist) { minDist = d; minIdx = i; }
    }
    console.log(`\nClosest route point to Kaniyur (11.095, 77.1514):`);
    console.log(`  Point [${minIdx}]: ${coords[minIdx]}, dist: ${minDist.toFixed(3)} km`);

    // Sample last 300 route points (closer to Coimbatore)
    console.log('\nLast 10 route points before destination:');
    for (let i = coords.length - 10; i < coords.length; i++) {
        console.log(`  [${i}] lat=${coords[i][0].toFixed(5)}, lng=${coords[i][1].toFixed(5)}`);
    }

    // Show route points around the 60-80% mark where Kaniyur should be
    console.log('\nRoute points at 50-85% along route (Kaniyur area):');
    const start = Math.floor(coords.length * 0.50);
    const end = Math.floor(coords.length * 0.85);
    for (let i = start; i < end; i += 50) {
        console.log(`  [${i}/${coords.length}] lat=${coords[i][0].toFixed(5)}, lng=${coords[i][1].toFixed(5)}`);
    }
}

debugRoute().catch(console.error);
