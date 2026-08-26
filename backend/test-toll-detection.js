/**
 * Test script for route-based toll detection — new effective-dated schema
 * Run: node test-toll-detection.js
 */
require('dotenv').config();
const pool = require('./src/config/db');

// ── Geometry helpers ───────────────────────────────────────────────────────────
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 +
              Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function minDistanceToPolyline(pLat, pLng, polyline) {
    if (!polyline || polyline.length === 0) return { minKm: Infinity, routeIndex: -1 };
    if (polyline.length === 1) return { minKm: haversineDistance(pLat, pLng, polyline[0][0], polyline[0][1]), routeIndex: 0 };
    let minKm = Infinity, closestIndex = -1;
    for (let i = 0; i < polyline.length - 1; i++) {
        const a = polyline[i], b = polyline[i+1];
        const dx = b[1]-a[1], dy = b[0]-a[0];
        const lenSq = dx*dx + dy*dy;
        let pj = a[0], pjl = a[1];
        if (lenSq > 0) {
            let t = ((pLng-a[1])*dx + (pLat-a[0])*dy) / lenSq;
            t = Math.max(0, Math.min(1, t));
            pj = a[0]+t*dy; pjl = a[1]+t*dx;
        }
        const d = haversineDistance(pLat, pLng, pj, pjl);
        if (d < minKm) { minKm = d; closestIndex = i; }
    }
    return { minKm, routeIndex: closestIndex };
}

async function fetchOSRMRoute(latS, lngS, latD, lngD) {
    const url = `https://router.project-osrm.org/route/v1/driving/${lngS},${latS};${lngD},${latD}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (res.ok) {
        const data = await res.json();
        if (data.routes?.length > 0) {
            return {
                coords: data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]),
                distKm: data.routes[0].distance / 1000
            };
        }
    }
    return null;
}

// ── Test Cases ────────────────────────────────────────────────────────────────
const TOLERANCE_KM = 0.30;    // 300 m — matches controller

const tests = [
    {
        name:          'Perundurai → Coimbatore (LCV) — primary test',
        latS: 11.2740, lngS: 77.5830,
        latD: 11.0168, lngD: 76.9558,
        category:      'LCV',
        tripDate:      '2026-08-26',  // current application date
        expectedPlazas: ['Vijayamangalam Toll Plaza', 'Kaniyur Toll Plaza'],
        expectedTotal:  295.00         // ₹115 + ₹180
    },
    {
        name:          'Perundurai → Coimbatore (LCV) — historical tariff 2026-05-15',
        latS: 11.2740, lngS: 77.5830,
        latD: 11.0168, lngD: 76.9558,
        category:      'LCV',
        tripDate:      '2026-05-15',
        expectedPlazas: ['Vijayamangalam Toll Plaza', 'Kaniyur Toll Plaza'],
        expectedTotal:  280.00         // ₹110 + ₹170
    },
    {
        name:          'Perundurai → Coimbatore (TRUCK_2_AXLE)',
        latS: 11.2740, lngS: 77.5830,
        latD: 11.0168, lngD: 76.9558,
        category:      'TRUCK_2_AXLE',
        tripDate:      '2026-08-26',
        expectedPlazas: ['Vijayamangalam Toll Plaza', 'Kaniyur Toll Plaza'],
        expectedTotal:  650.00         // ₹275 + ₹375
    },
    {
        name:          'Chennai → Bengaluru (TRUCK_2_AXLE)',
        latS: 13.0827, lngS: 80.2707,
        latD: 12.9716, lngD: 77.5946,
        category:      'TRUCK_2_AXLE',
        tripDate:      '2026-08-26',
        expectedPlazas: null,   // dynamic — just print what's found
        expectedTotal:  null
    }
];

async function runTests() {
    const client = await pool.connect();
    try {
        console.log('🚀 Route-Based Toll Detection Test (effective-dated schema)\n');
        console.log('='.repeat(60));

        let allPassed = true;

        for (const test of tests) {
            console.log(`\n▶  ${test.name}`);
            console.log(`   Category : ${test.category}  |  Trip Date : ${test.tripDate}`);

            const route = await fetchOSRMRoute(test.latS, test.lngS, test.latD, test.lngD);
            let polyline, distKm;
            if (route) {
                polyline = route.coords;
                distKm   = route.distKm;
                console.log(`   Route    : ${polyline.length} waypoints — ${distKm.toFixed(1)} km`);
            } else {
                polyline = [[test.latS, test.lngS], [test.latD, test.lngD]];
                distKm   = haversineDistance(test.latS, test.lngS, test.latD, test.lngD);
                console.log(`   ⚠️  OSRM unavailable — straight line: ${distKm.toFixed(1)} km`);
            }

            // Detect plazas within corridor
            const plazaRes = await client.query(
                `SELECT id, name, highway, state, latitude, longitude FROM toll_plazas WHERE active = true`
            );
            const detected = [];
            for (const p of plazaRes.rows) {
                const { minKm, routeIndex } = minDistanceToPolyline(
                    parseFloat(p.latitude), parseFloat(p.longitude), polyline
                );
                if (minKm <= TOLERANCE_KM) detected.push({ ...p, minKm, routeIndex });
            }
            detected.sort((a, b) => a.routeIndex - b.routeIndex);

            // Lookup effective rate for each plaza
            let totalToll = 0;
            console.log(`\n   🛑 Detected ${detected.length} plaza(s) within ${TOLERANCE_KM*1000}m:`);

            for (const p of detected) {
                const rateRes = await client.query(
                    `SELECT amount, effective_from, effective_until, source
                     FROM toll_rates
                     WHERE toll_plaza_id    = $1
                       AND vehicle_category = $2
                       AND journey_type     = 'SINGLE'
                       AND $3::date         >= effective_from
                       AND (effective_until IS NULL OR $3::date <= effective_until)
                     ORDER BY effective_from DESC`,
                    [p.id, test.category, test.tripDate]
                );

                if (rateRes.rows.length === 0) {
                    console.log(`      • ${p.name} (${p.highway})  —  ⚠️  No rate found for ${test.category} on ${test.tripDate}`);
                } else if (rateRes.rows.length > 1) {
                    console.log(`      • ${p.name} (${p.highway})  —  ❌  DATA CONFLICT: ${rateRes.rows.length} active rates!`);
                } else {
                    const r = rateRes.rows[0];
                    const amt = parseFloat(r.amount);
                    totalToll += amt;
                    const until = r.effective_until ? r.effective_until.toISOString().split('T')[0] : 'open';
                    console.log(`      • ${p.name} (${p.highway})  —  ₹${amt.toFixed(2)}  [${r.effective_from.toISOString().split('T')[0]} → ${until}]  (${p.minKm.toFixed(3)} km from route)`);
                }
            }

            console.log(`\n   💰 Total (${test.category}) : ₹${totalToll.toFixed(2)}`);

            if (test.expectedTotal !== null) {
                const match = Math.abs(totalToll - test.expectedTotal) < 0.01;
                console.log(`   ${match ? '✅' : '❌'} Expected ₹${test.expectedTotal.toFixed(2)} — Got ₹${totalToll.toFixed(2)}`);
                if (!match) allPassed = false;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log(allPassed ? '✅ All tests passed!\n' : '❌ Some tests failed — check output above.\n');

    } catch (err) {
        console.error('❌ Test error:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

runTests();
