const pool = require('../config/db');

const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

// Helper: resolve authenticated user ID for created_by FK
async function resolveUserId(req) {
    const reqUserId = req.user?.id || req.user?.userId || req.user?.sub;
    const reqUserEmail = req.user?.email;

    if (reqUserId && isUUID(reqUserId)) {
        const r = await pool.query('SELECT id FROM users WHERE id = $1', [reqUserId]);
        if (r.rows.length > 0) return r.rows[0].id;
    }
    if (reqUserEmail) {
        const r = await pool.query('SELECT id FROM users WHERE email = $1', [reqUserEmail]);
        if (r.rows.length > 0) return r.rows[0].id;
    }
    const r = await pool.query('SELECT id FROM users ORDER BY created_at ASC LIMIT 1');
    return r.rows.length > 0 ? r.rows[0].id : null;
}

// Helper: get current fuel price for a fuel type
async function getCurrentFuelPrice(fuelType = 'Diesel') {
    const r = await pool.query(
        `SELECT price_per_liter FROM fuel_price
         WHERE fuel_type = $1 AND effective_from <= CURRENT_DATE
         AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
         ORDER BY effective_from DESC LIMIT 1`,
        [fuelType]
    );
    return r.rows.length > 0 ? parseFloat(r.rows[0].price_per_liter) : 100.0;
}

exports.getTrips = async (req, res) => {
    try {
        const query = `
            SELECT t.*,
                v.registration_no, v.vehicle_name, v.fuel_efficiency_kmpl, v.fuel_type,
                d.name AS driver_name, d.license_expiry
            FROM trips t
            LEFT JOIN vehicles v ON t.vehicle_id = v.id
            LEFT JOIN drivers d ON t.driver_id = d.id
            ORDER BY t.created_at DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.createTrip = async (req, res) => {
    const {
        vehicle_id, driver_id, source, destination, cargo_weight,
        source_latitude, source_longitude, destination_latitude, destination_longitude,
        planned_distance, estimated_duration_min,
        current_fuel_liters, toll_amount
    } = req.body;

    if (!vehicle_id || !driver_id) {
        return res.status(400).json({ message: 'Both vehicle and driver must be selected.' });
    }
    if (!isUUID(vehicle_id)) return res.status(400).json({ message: 'Invalid vehicle ID format.' });
    if (!isUUID(driver_id)) return res.status(400).json({ message: 'Invalid driver ID format.' });
    if (!source || !destination) return res.status(400).json({ message: 'Source and destination are required.' });
    if (source.trim().toLowerCase() === destination.trim().toLowerCase()) {
        return res.status(400).json({ message: 'Source and destination cannot be the same.' });
    }

    const latS = parseFloat(source_latitude);
    const lngS = parseFloat(source_longitude);
    const latD = parseFloat(destination_latitude);
    const lngD = parseFloat(destination_longitude);

    if (isNaN(latS) || isNaN(lngS) || isNaN(latD) || isNaN(lngD)) {
        return res.status(400).json({ message: 'Source and destination coordinates must be selected using suggestions or map pin.' });
    }

    const distKm = parseFloat(planned_distance) || 0;
    if (distKm <= 0) {
        return res.status(400).json({ message: 'Route distance must be greater than 0. Please select source and destination on the map.' });
    }

    const createdBy = await resolveUserId(req);

    try {
        await pool.query('BEGIN');

        // 1. Validate vehicle
        const vRes = await pool.query(
            'SELECT id, registration_no, vehicle_name, status, fuel_efficiency_kmpl, fuel_tank_capacity_liters, current_fuel_level_liters, fuel_type, odometer, max_load_capacity FROM vehicles WHERE id = $1 FOR UPDATE',
            [vehicle_id]
        );
        if (vRes.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ message: 'Selected vehicle does not exist.' });
        }
        const vehicle = vRes.rows[0];
        if (vehicle.status !== 'Available') {
            await pool.query('ROLLBACK');
            return res.status(400).json({ message: `Vehicle ${vehicle.vehicle_name} (${vehicle.registration_no}) is currently ${vehicle.status} and cannot be dispatched.` });
        }

        // Validate cargo weight against vehicle max load capacity
        const maxLoad = vehicle.max_load_capacity ? parseFloat(vehicle.max_load_capacity) : null;
        const cargoKg = cargo_weight ? parseFloat(cargo_weight) : 0;
        if (maxLoad !== null && cargoKg > maxLoad) {
            await pool.query('ROLLBACK');
            return res.status(400).json({ message: `Goods weight (${cargoKg} kg) exceeds vehicle load capacity (${maxLoad} kg).` });
        }

        // Check no active trip for this vehicle
        const activeVTrip = await pool.query(
            "SELECT id FROM trips WHERE vehicle_id = $1 AND status IN ('Dispatched', 'Draft')",
            [vehicle_id]
        );
        if (activeVTrip.rows.length > 0) {
            await pool.query('ROLLBACK');
            return res.status(400).json({ message: `Vehicle ${vehicle.vehicle_name} (${vehicle.registration_no}) is already assigned to an active trip.` });
        }

        // 2. Validate driver
        const dRes = await pool.query(
            'SELECT id, name, status, license_expiry FROM drivers WHERE id = $1 FOR UPDATE',
            [driver_id]
        );
        if (dRes.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ message: 'Selected driver does not exist.' });
        }
        const driver = dRes.rows[0];
        if (driver.status !== 'Available') {
            await pool.query('ROLLBACK');
            return res.status(400).json({ message: `Driver ${driver.name} is currently "${driver.status}" and cannot be dispatched. Please select an Available driver.` });
        }
        // Check license expiry
        if (driver.license_expiry && new Date(driver.license_expiry) < new Date()) {
            await pool.query('ROLLBACK');
            return res.status(400).json({ message: `Driver ${driver.name}'s license has expired on ${new Date(driver.license_expiry).toLocaleDateString()}. Cannot assign.` });
        }

        // Check no active trip for this driver
        const activeDTrip = await pool.query(
            "SELECT id FROM trips WHERE driver_id = $1 AND status IN ('Dispatched', 'Draft')",
            [driver_id]
        );
        if (activeDTrip.rows.length > 0) {
            await pool.query('ROLLBACK');
            return res.status(400).json({ message: `Driver ${driver.name} is already assigned to an active trip.` });
        }

        // 3. Backend fuel calculation (do not trust frontend values blindly)
        const efficiency = vehicle.fuel_efficiency_kmpl ? parseFloat(vehicle.fuel_efficiency_kmpl) : null;
        const tankCap = vehicle.fuel_tank_capacity_liters ? parseFloat(vehicle.fuel_tank_capacity_liters) : null;

        // Resolve current fuel level
        let curFuel = current_fuel_liters !== undefined && current_fuel_liters !== null && current_fuel_liters !== ''
            ? parseFloat(current_fuel_liters)
            : parseFloat(vehicle.current_fuel_level_liters || 0);

        if (isNaN(curFuel) || curFuel < 0) curFuel = 0;

        // Validate fuel level vs tank capacity
        if (tankCap !== null && curFuel > tankCap) {
            await pool.query('ROLLBACK');
            return res.status(400).json({ message: `Current fuel level (${curFuel}L) cannot exceed tank capacity (${tankCap}L).` });
        }

        // Calculate fuel estimates
        let estimatedFuel = null;
        let additionalFuel = null;
        let estimatedFuelCost = null;
        const fuelType = vehicle.fuel_type || 'Diesel';
        const fuelPrice = await getCurrentFuelPrice(fuelType);

        if (efficiency && efficiency > 0) {
            estimatedFuel = Math.round((distKm / efficiency) * 100) / 100;
            additionalFuel = Math.max(estimatedFuel - curFuel, 0);
            estimatedFuelCost = Math.round(additionalFuel * fuelPrice * 100) / 100;
        }

        const startOdometer = vehicle.odometer ? parseFloat(vehicle.odometer) : 0;
        const toll = toll_amount ? parseFloat(toll_amount) : 0;
        const estFuelCost = estimatedFuelCost || 0;
        const totalTripCost = estFuelCost + toll;

        // 4. Create trip
        const insertQuery = `
            INSERT INTO trips (
                vehicle_id, driver_id, source, destination, cargo_weight,
                planned_distance, estimated_duration_min,
                source_latitude, source_longitude, destination_latitude, destination_longitude,
                estimated_fuel_liters, current_fuel_liters, additional_fuel_required_liters,
                estimated_fuel_cost, fuel_price_per_liter,
                status, created_by, start_time,
                start_odometer, toll_amount, total_trip_cost
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'Dispatched',$17,CURRENT_TIMESTAMP,$18,$19,$20)
            RETURNING *
        `;
        const result = await pool.query(insertQuery, [
            vehicle_id, driver_id,
            source || '', destination || '',
            cargo_weight ? Number(cargo_weight) : null,
            distKm,
            estimated_duration_min ? parseInt(estimated_duration_min) : null,
            source_latitude ? parseFloat(source_latitude) : null,
            source_longitude ? parseFloat(source_longitude) : null,
            destination_latitude ? parseFloat(destination_latitude) : null,
            destination_longitude ? parseFloat(destination_longitude) : null,
            estimatedFuel,
            curFuel,
            additionalFuel,
            estimatedFuelCost,
            fuelPrice,
            createdBy,
            startOdometer,
            toll,
            totalTripCost
        ]);

        // 5. Update vehicle and driver status + vehicle fuel level
        await pool.query(
            "UPDATE vehicles SET status = 'On Trip', current_fuel_level_liters = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
            [curFuel, vehicle_id]
        );
        await pool.query(
            "UPDATE drivers SET status = 'On Trip', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
            [driver_id]
        );

        await pool.query('COMMIT');

        // Return trip with vehicle and driver info
        const tripData = result.rows[0];
        tripData.registration_no = vehicle.registration_no;
        tripData.vehicle_name = vehicle.vehicle_name;
        tripData.driver_name = driver.name;
        tripData.fuel_efficiency_kmpl = vehicle.fuel_efficiency_kmpl;
        tripData.fuel_type = fuelType;

        res.status(201).json(tripData);
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('Error in createTrip:', err);
        const errMsg = err.code === '22P02' ? 'Invalid ID format' : (err.message || 'Server error creating trip');
        res.status(400).json({ message: errMsg });
    }
};

exports.updateTrip = async (req, res) => {
    const { id } = req.params;
    const { status, actual_distance, final_odometer, fuel_used, revenue, actual_fuel_consumed, toll_amount } = req.body;

    try {
        await pool.query('BEGIN');

        const currentTrip = await pool.query('SELECT * FROM trips WHERE id = $1 FOR UPDATE', [id]);
        if (currentTrip.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ message: 'Trip not found' });
        }

        const oldStatus = currentTrip.rows[0].status;
        if (oldStatus === 'Completed' || oldStatus === 'Cancelled') {
            await pool.query('ROLLBACK');
            return res.status(400).json({ message: `Trip is already in ${oldStatus} state and cannot be modified.` });
        }

        const vehicle_id = currentTrip.rows[0].vehicle_id;
        const driver_id = currentTrip.rows[0].driver_id;
        const isEnding = status === 'Completed' || status === 'Cancelled';
        const endTimeClause = isEnding ? ', end_time = CURRENT_TIMESTAMP' : '';

        // Fallbacks for completion metrics
        const plannedDistance = currentTrip.rows[0].planned_distance || 0;
        const finalActualDistance = (status === 'Completed')
            ? (actual_distance !== undefined && actual_distance !== null && actual_distance !== '' ? parseFloat(actual_distance) : parseFloat(plannedDistance))
            : (actual_distance !== undefined && actual_distance !== null ? parseFloat(actual_distance) : null);

        const startOdoVal = currentTrip.rows[0].start_odometer ? parseFloat(currentTrip.rows[0].start_odometer) : 0;
        const finalOdometerVal = (status === 'Completed')
            ? (final_odometer !== undefined && final_odometer !== null && final_odometer !== '' ? parseFloat(final_odometer) : startOdoVal + finalActualDistance)
            : (final_odometer !== undefined && final_odometer !== null ? parseFloat(final_odometer) : null);

        const actualFuelConsumed = actual_fuel_consumed ? parseFloat(actual_fuel_consumed) : (fuel_used ? parseFloat(fuel_used) : null);
        let actualFuelCost = null;
        const fuelPriceUsed = currentTrip.rows[0].fuel_price_per_liter;
        if (status === 'Completed' && actualFuelConsumed !== null && fuelPriceUsed) {
            actualFuelCost = Math.round(actualFuelConsumed * parseFloat(fuelPriceUsed) * 100) / 100;
        }

        const finalTollAmount = toll_amount !== undefined && toll_amount !== null && toll_amount !== ''
            ? parseFloat(toll_amount)
            : parseFloat(currentTrip.rows[0].toll_amount || 0);

        let totalTripCost = null;
        if (status === 'Completed') {
            totalTripCost = (actualFuelCost || 0) + finalTollAmount;
        }

        const updateQuery = `
            UPDATE trips
            SET status = COALESCE($1, status),
                actual_distance = COALESCE($2, actual_distance),
                final_odometer = COALESCE($3, final_odometer),
                fuel_used = COALESCE($4, fuel_used),
                revenue = COALESCE($5, revenue),
                actual_fuel_cost = COALESCE($6, actual_fuel_cost),
                toll_amount = COALESCE($7, toll_amount),
                total_trip_cost = COALESCE($8, total_trip_cost),
                updated_at = CURRENT_TIMESTAMP
                ${endTimeClause}
            WHERE id = $9 RETURNING *
        `;
        const result = await pool.query(updateQuery, [
            status,
            finalActualDistance,
            finalOdometerVal,
            actualFuelConsumed,
            revenue || null,
            actualFuelCost,
            finalTollAmount,
            totalTripCost,
            id
        ]);

        // Status transitions
        if (isEnding) {
            await pool.query("UPDATE vehicles SET status = 'Available', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [vehicle_id]);
            await pool.query("UPDATE drivers SET status = 'Available', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [driver_id]);

            // On completion: update odometer and auto-create fuel log
            if (status === 'Completed' && finalOdometerVal) {
                await pool.query(
                    'UPDATE vehicles SET odometer = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                    [finalOdometerVal, vehicle_id]
                );
            }

            // Auto-create fuel log when trip completes with fuel data
            if (status === 'Completed' && actualFuelConsumed && actualFuelConsumed > 0) {
                const createdBy = await resolveUserId(req);
                const fp = fuelPriceUsed ? parseFloat(fuelPriceUsed) : null;
                await pool.query(
                    `INSERT INTO fuel (vehicle_id, trip_id, fuel_amount, cost, price_per_liter, fuel_type, date, created_by)
                     SELECT $1, $2, $3, $4, $5, v.fuel_type, CURRENT_TIMESTAMP, $6
                     FROM vehicles v WHERE v.id = $1`,
                    [vehicle_id, id, actualFuelConsumed, actualFuelCost, fp, createdBy]
                );
            }
        }

        await pool.query('COMMIT');
        res.json(result.rows[0]);
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('Error in updateTrip:', err);
        res.status(500).json({ message: 'Server error updating trip' });
    }
};

exports.deleteTrip = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('BEGIN');
        const trip = await pool.query('SELECT * FROM trips WHERE id = $1', [id]);
        if (trip.rows.length > 0) {
            const { status, vehicle_id, driver_id } = trip.rows[0];
            if (status !== 'Completed' && status !== 'Cancelled') {
                await pool.query("UPDATE vehicles SET status = 'Available' WHERE id = $1", [vehicle_id]);
                await pool.query("UPDATE drivers SET status = 'Available' WHERE id = $1", [driver_id]);
            }
            await pool.query('DELETE FROM trips WHERE id = $1', [id]);
        }
        await pool.query('COMMIT');
        res.json({ message: 'Trip deleted' });
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getActiveTrips = async (req, res) => {
    try {
        const query = `
            SELECT t.*,
                v.registration_no, v.vehicle_name, v.fuel_type,
                d.name AS driver_name
            FROM trips t
            LEFT JOIN vehicles v ON t.vehicle_id = v.id
            LEFT JOIN drivers d ON t.driver_id = d.id
            WHERE t.status = 'Dispatched'
            ORDER BY t.start_time DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
