const pool = require('../config/db');

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Corridor radius around the route polyline used to detect plazas (300 m). */
const TOLL_CORRIDOR_KM = 0.30;

/** Valid vehicle toll categories */
const VALID_CATEGORIES = ['CAR', 'LCV', 'TRUCK_2_AXLE', 'TRUCK_3_AXLE', 'TRUCK_4_TO_6_AXLE', 'TRUCK_7_PLUS_AXLE'];

// ─────────────────────────────────────────────────────────────────────────────
// Geometry helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Haversine distance between two lat/lng points, in kilometres. */
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Minimum perpendicular distance from a point to a polyline (km).
 * Also returns the polyline segment index where the closest point lies.
 */
function minDistanceToPolyline(plazaLat, plazaLng, polyline) {
    if (!polyline || polyline.length === 0) return { minKm: Infinity, routeIndex: -1 };
    if (polyline.length === 1) {
        return {
            minKm: haversineDistance(plazaLat, plazaLng, polyline[0][0], polyline[0][1]),
            routeIndex: 0
        };
    }

    let minKm = Infinity;
    let closestIndex = -1;

    for (let i = 0; i < polyline.length - 1; i++) {
        const a = polyline[i];
        const b = polyline[i + 1];
        const dx = b[1] - a[1];
        const dy = b[0] - a[0];
        const lenSq = dx * dx + dy * dy;

        let projLat = a[0];
        let projLng = a[1];

        if (lenSq > 0) {
            let t = ((plazaLng - a[1]) * dx + (plazaLat - a[0]) * dy) / lenSq;
            t = Math.max(0, Math.min(1, t));
            projLat = a[0] + t * dy;
            projLng = a[1] + t * dx;
        }

        const dist = haversineDistance(plazaLat, plazaLng, projLat, projLng);
        if (dist < minKm) {
            minKm = dist;
            closestIndex = i;
        }
    }

    return { minKm, routeIndex: closestIndex };
}

// ─────────────────────────────────────────────────────────────────────────────
// External API helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Geocode a free-text address using Nominatim. */
async function geocodeLocation(addr) {
    if (!addr || typeof addr !== 'string') return null;
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}&limit=1`,
            { headers: { 'User-Agent': 'TransitOps-FleetManagement' } }
        );
        if (res.ok) {
            const data = await res.json();
            if (data && data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
    } catch (err) {
        console.warn('[Toll] Geocoding failed for:', addr, err.message);
    }
    return null;
}

/** Fetch driving route geometry from OSRM. Returns [[lat, lng], ...] */
async function fetchOSRMRoute(latS, lngS, latD, lngD) {
    try {
        const url = `https://router.project-osrm.org/route/v1/driving/${lngS},${latS};${lngD},${latD}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            if (data.routes && data.routes.length > 0) {
                const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
                const distKm = data.routes[0].distance / 1000;
                return { coords, distKm };
            }
        }
    } catch (err) {
        console.warn('[Toll] OSRM routing failed:', err.message);
    }
    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Label helper
// ─────────────────────────────────────────────────────────────────────────────

function getCategoryLabel(cat) {
    const map = {
        CAR:               'Car / SUV',
        LCV:               'Light Commercial Vehicle (LCV)',
        TRUCK_2_AXLE:      'Truck – 2 Axle',
        TRUCK_3_AXLE:      'Truck – 3 Axle',
        TRUCK_4_TO_6_AXLE: 'Truck – 4 to 6 Axle',
        TRUCK_7_PLUS_AXLE: 'Heavy Truck – 7+ Axle'
    };
    return map[cat] || cat || 'Truck – 2 Axle';
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin: list all toll rates
// ─────────────────────────────────────────────────────────────────────────────

exports.getTollRates = async (req, res) => {
    try {
        const { vehicle_class, active, state } = req.query;
        let query = `
            SELECT r.*, p.name AS toll_name, p.highway, p.state, p.latitude, p.longitude
            FROM toll_rates r
            JOIN toll_plazas p ON r.toll_plaza_id = p.id
            WHERE 1=1
        `;
        const params = [];
        let idx = 1;

        if (vehicle_class) { query += ` AND r.vehicle_category ILIKE $${idx++}`; params.push(vehicle_class); }
        if (active !== undefined) { query += ` AND p.active = $${idx++}`; params.push(active === 'true'); }
        if (state) { query += ` AND p.state ILIKE $${idx++}`; params.push(`%${state}%`); }

        query += ' ORDER BY p.name, r.vehicle_category, r.journey_type, r.effective_from DESC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('[Toll] getTollRates error:', err);
        res.status(500).json({ message: 'Server error fetching toll rates' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Core: route-based toll calculation
// ─────────────────────────────────────────────────────────────────────────────

exports.calculateTolls = async (req, res) => {
    try {
        const body = req.body || {};

        const {
            source, destination,
            source_latitude, source_longitude,
            destination_latitude, destination_longitude,
            vehicle_id, vehicle_class, axle_count,
            route_geometry,
            trip_date, tripDate   // accept both spellings
        } = body;

        // ── 1. Resolve trip date ───────────────────────────────────────────
        // Use whichever date the client sends; fall back to today.
        const rawDate    = trip_date || tripDate || null;
        const resolvedDate = rawDate
            ? new Date(rawDate).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0];
        console.log(`[Toll] Trip date for tariff lookup: ${resolvedDate}`);

        // ── 2. Resolve source & destination coordinates ────────────────────
        let latS = parseFloat(source_latitude);
        let lngS = parseFloat(source_longitude);
        let latD = parseFloat(destination_latitude);
        let lngD = parseFloat(destination_longitude);

        if (isNaN(latS) || isNaN(lngS)) {
            const g = await geocodeLocation(source);
            if (g) { latS = g.lat; lngS = g.lng; }
        }
        if (isNaN(latD) || isNaN(lngD)) {
            const g = await geocodeLocation(destination);
            if (g) { latD = g.lat; lngD = g.lng; }
        }

        if (isNaN(latS) || isNaN(lngS)) return res.status(400).json({ message: 'Unable to determine source location.' });
        if (isNaN(latD) || isNaN(lngD)) return res.status(400).json({ message: 'Unable to determine destination location.' });

        // ── 3. Resolve vehicle toll category ──────────────────────────────
        let category  = 'TRUCK_2_AXLE';
        let vehicleObj = null;
        const isValidUuid = v => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

        if (vehicle_id && isValidUuid(vehicle_id)) {
            const vRes = await pool.query(
                `SELECT id, registration_no, vehicle_name, vehicle_type, toll_category, axle_count FROM vehicles WHERE id = $1`,
                [vehicle_id]
            );
            if (vRes.rows.length > 0) {
                vehicleObj = vRes.rows[0];
                if (vehicleObj.toll_category && VALID_CATEGORIES.includes(vehicleObj.toll_category)) {
                    category = vehicleObj.toll_category;
                } else {
                    // Infer from vehicle_type / axle_count
                    const vt = (vehicleObj.vehicle_type || '').toLowerCase();
                    const ac = parseInt(vehicleObj.axle_count || 2);
                    if (vt.includes('car') || vt.includes('suv')) category = 'CAR';
                    else if (vt.includes('van') || vt.includes('tempo') || vt.includes('mini') || vt.includes('lcv')) category = 'LCV';
                    else if (ac === 3) category = 'TRUCK_3_AXLE';
                    else if (ac >= 4 && ac <= 6) category = 'TRUCK_4_TO_6_AXLE';
                    else if (ac >= 7) category = 'TRUCK_7_PLUS_AXLE';
                    else category = 'TRUCK_2_AXLE';
                }
            }
        } else if (vehicle_class || axle_count) {
            const vc = (vehicle_class || '').toUpperCase();
            const ac = parseInt(axle_count || 2);

            if (VALID_CATEGORIES.includes(vc)) {
                category = vc;
            } else if (vc.includes('CAR') || vc.includes('SUV')) category = 'CAR';
            else if (vc.includes('VAN') || vc.includes('MINI') || vc.includes('TEMPO') || vc.includes('LCV')) category = 'LCV';
            else if (ac === 3) category = 'TRUCK_3_AXLE';
            else if (ac >= 4 && ac <= 6) category = 'TRUCK_4_TO_6_AXLE';
            else if (ac >= 7) category = 'TRUCK_7_PLUS_AXLE';
            else category = 'TRUCK_2_AXLE';
        }

        // Validate category
        if (!VALID_CATEGORIES.includes(category)) {
            return res.status(400).json({ message: 'Vehicle toll category is not configured.' });
        }

        console.log(`[Toll] Resolved vehicle category: ${category}`);

        // ── 4. Resolve route geometry / polyline ─────────────────────────
        let polyline  = [];
        let distanceKm = 0;

        if (Array.isArray(route_geometry) && route_geometry.length >= 2) {
            polyline   = route_geometry;
            distanceKm = haversineDistance(polyline[0][0], polyline[0][1], polyline[polyline.length - 1][0], polyline[polyline.length - 1][1]);
        } else {
            const osrmRes = await fetchOSRMRoute(latS, lngS, latD, lngD);
            if (osrmRes && osrmRes.coords.length > 0) {
                polyline   = osrmRes.coords;
                distanceKm = osrmRes.distKm;
            } else {
                // Straight-line fallback
                polyline   = [[latS, lngS], [latD, lngD]];
                distanceKm = haversineDistance(latS, lngS, latD, lngD);
            }
        }

        // ── 5. Fetch all active toll plazas ───────────────────────────────
        const plazaRes = await pool.query(
            `SELECT id, name, highway, state, latitude, longitude FROM toll_plazas WHERE active = true`
        );

        // ── 6. Geospatial intersection: filter plazas within corridor ─────
        const detectedPlazas = [];
        for (const plaza of plazaRes.rows) {
            const pLat = parseFloat(plaza.latitude);
            const pLng = parseFloat(plaza.longitude);
            const { minKm, routeIndex } = minDistanceToPolyline(pLat, pLng, polyline);

            if (minKm <= TOLL_CORRIDOR_KM) {
                detectedPlazas.push({ ...plaza, pLat, pLng, minKm, routeIndex });
            }
        }

        // Sort by travel order along route
        detectedPlazas.sort((a, b) => a.routeIndex - b.routeIndex);

        console.log(`[Toll] ${detectedPlazas.length} plaza(s) within ${TOLL_CORRIDOR_KM * 1000}m corridor`);

        if (detectedPlazas.length === 0) {
            return res.json({
                distanceKm:          Math.round(distanceKm * 10) / 10,
                vehicleCategory:     category,
                vehicleCategoryLabel: getCategoryLabel(category),
                tolls_detected:      [],
                total_toll_amount:   0,
                message:             'No toll plazas detected on this route. Total Toll: ₹0',
                source_latitude:     latS,
                source_longitude:    lngS,
                destination_latitude:  latD,
                destination_longitude: lngD,
                trip_date:           resolvedDate,
                source:              'TransitOps Route Geospatial Toll System'
            });
        }

        // ── 7. Lookup effective toll rates ────────────────────────────────
        let totalToll = 0;
        const tollsList = [];
        const errors   = [];

        for (const p of detectedPlazas) {
            const rateRes = await pool.query(
                `SELECT id, amount, journey_type, effective_from, effective_until, source
                 FROM toll_rates
                 WHERE toll_plaza_id   = $1
                   AND vehicle_category = $2
                   AND journey_type     = 'SINGLE'
                   AND $3::date         >= effective_from
                   AND (effective_until IS NULL OR $3::date <= effective_until)
                 ORDER BY effective_from DESC`,
                [p.id, category, resolvedDate]
            );

            if (rateRes.rows.length === 0) {
                const msg = `Toll rate unavailable for ${category} at ${p.name}.`;
                console.warn(`[Toll] ⚠️  ${msg}`);
                errors.push(msg);
                tollsList.push({
                    id:                   p.id,
                    name:                 p.name,
                    highway:              p.highway,
                    state:                p.state,
                    latitude:             p.pLat,
                    longitude:            p.pLng,
                    vehicleCategory:      category,
                    vehicleCategoryLabel: getCategoryLabel(category),
                    toll_amount:          null,
                    rateStatus:           'TOLL_RATE_UNAVAILABLE',
                    rateMessage:          msg
                });
                continue;
            }

            if (rateRes.rows.length > 1) {
                const msg = `Data conflict: Multiple active toll rates found for ${category} at ${p.name}. Using the most recent.`;
                console.error(`[Toll] ❌ ${msg}`, rateRes.rows.map(r => `₹${r.amount} (from ${r.effective_from})`));
                errors.push(msg);
                // Still proceed with the latest (first row due to ORDER BY DESC)
            }

            const row    = rateRes.rows[0];
            const amount = parseFloat(row.amount);
            totalToll += amount;

            tollsList.push({
                id:                   p.id,
                name:                 p.name,
                highway:              p.highway,
                state:                p.state,
                latitude:             p.pLat,
                longitude:            p.pLng,
                vehicleCategory:      category,
                vehicleCategoryLabel: getCategoryLabel(category),
                toll_amount:          amount,
                journey_type:         row.journey_type,
                effective_from:       row.effective_from,
                effective_until:      row.effective_until,
                rateStatus:           'Available',
                rateSource:           row.source || 'NHAI Official Tariff',
                distanceFromRoute:    Math.round(p.minKm * 1000)  // metres
            });
        }

        const formattedTotal = Math.round(totalToll * 100) / 100;
        const hasUnavailable = tollsList.some(t => t.rateStatus === 'TOLL_RATE_UNAVAILABLE');

        // If any plaza has a rate unavailable and no tolls at all were priced, return 400
        if (hasUnavailable && formattedTotal === 0) {
            return res.status(400).json({
                message: errors[0] || 'Toll rate unavailable for this vehicle category.',
                errors,
                vehicleCategory:     category,
                vehicleCategoryLabel: getCategoryLabel(category),
                tolls_detected:      tollsList,
                total_toll_amount:   0,
                trip_date:           resolvedDate
            });
        }

        const plazaWord = tollsList.length > 1 ? 'Plazas' : 'Plaza';
        const summaryMsg = `${tollsList.length} Toll ${plazaWord} Detected (Total: ₹${formattedTotal})${errors.length ? ' — ⚠️ ' + errors[0] : ''}`;

        res.json({
            distanceKm:            Math.round(distanceKm * 10) / 10,
            vehicleCategory:       category,
            vehicleCategoryLabel:  getCategoryLabel(category),
            tolls_detected:        tollsList,
            total_toll_amount:     formattedTotal,
            message:               summaryMsg,
            errors:                errors.length ? errors : undefined,
            source_latitude:       latS,
            source_longitude:      lngS,
            destination_latitude:  latD,
            destination_longitude: lngD,
            trip_date:             resolvedDate,
            source:                'TransitOps Route Geospatial Toll System'
        });

    } catch (err) {
        console.error('[Toll] calculateTolls error:', err);
        res.status(500).json({ message: 'Unable to calculate route tolls. Please try again.' });
    }
};

// Alias for legacy GET /estimate calls
exports.getTollEstimate = exports.calculateTolls;

// ─────────────────────────────────────────────────────────────────────────────
// Admin CRUD
// ─────────────────────────────────────────────────────────────────────────────

exports.createTollRate = async (req, res) => {
    try {
        const {
            toll_name, location, highway, state,
            vehicle_class, journey_type = 'SINGLE',
            toll_amount, amount,
            effective_from, effective_until,
            source
        } = req.body;

        const rateAmount = parseFloat(amount || toll_amount);
        if (!toll_name || !vehicle_class || isNaN(rateAmount)) {
            return res.status(400).json({ message: 'toll_name, vehicle_class, and amount are required.' });
        }
        if (!VALID_CATEGORIES.includes(vehicle_class.toUpperCase())) {
            return res.status(400).json({ message: 'Vehicle toll category is not configured.' });
        }

        // Find or create plaza
        let plazaRes = await pool.query(`SELECT id FROM toll_plazas WHERE name = $1`, [toll_name]);
        let plazaId;
        if (plazaRes.rows.length === 0) {
            const ins = await pool.query(
                `INSERT INTO toll_plazas (name, highway, state, latitude, longitude, active) VALUES ($1, $2, $3, 0, 0, true) RETURNING id`,
                [toll_name, highway || 'NH', state || 'India']
            );
            plazaId = ins.rows[0].id;
        } else {
            plazaId = plazaRes.rows[0].id;
        }

        const rateRes = await pool.query(
            `INSERT INTO toll_rates (toll_plaza_id, vehicle_category, journey_type, amount, effective_from, effective_until, source)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (toll_plaza_id, vehicle_category, journey_type, effective_from)
             DO UPDATE SET amount = EXCLUDED.amount, effective_until = EXCLUDED.effective_until,
                           source = EXCLUDED.source, updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [plazaId, vehicle_class.toUpperCase(), journey_type.toUpperCase(), rateAmount,
             effective_from || new Date().toISOString().split('T')[0],
             effective_until || null,
             source || 'Admin Entry']
        );
        res.status(201).json(rateRes.rows[0]);
    } catch (err) {
        console.error('[Toll] createTollRate error:', err);
        res.status(500).json({ message: 'Server error creating toll rate' });
    }
};

exports.updateTollRate = async (req, res) => {
    try {
        const { id } = req.params;
        const { toll_amount, amount, effective_until, source } = req.body;
        const rateAmount = parseFloat(amount || toll_amount);

        if (isNaN(rateAmount)) return res.status(400).json({ message: 'amount is required.' });

        const result = await pool.query(
            `UPDATE toll_rates SET amount = $1, effective_until = $2, source = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *`,
            [rateAmount, effective_until || null, source || null, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'Toll rate not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('[Toll] updateTollRate error:', err);
        res.status(500).json({ message: 'Server error updating toll rate' });
    }
};

exports.deleteTollRate = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM toll_rates WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'Toll rate not found' });
        res.json({ message: 'Toll rate deleted successfully' });
    } catch (err) {
        console.error('[Toll] deleteTollRate error:', err);
        res.status(500).json({ message: 'Server error deleting toll rate' });
    }
};
