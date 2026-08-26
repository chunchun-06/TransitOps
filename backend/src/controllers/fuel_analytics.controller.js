const pool = require('../config/db');

/**
 * Calculates date range condition for SQL queries
 */
function getDateCondition(range, startDate, endDate, dateCol) {
    switch (range) {
        case 'today':
            return `${dateCol} >= CURRENT_DATE`;
        case 'this_week':
            return `${dateCol} >= date_trunc('week', CURRENT_DATE)`;
        case 'this_month':
            return `${dateCol} >= date_trunc('month', CURRENT_DATE)`;
        case 'last_month':
            return `${dateCol} >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month') AND ${dateCol} < date_trunc('month', CURRENT_DATE)`;
        case 'custom':
            if (startDate && endDate) {
                return `${dateCol} >= '${startDate}'::date AND ${dateCol} <= '${endDate}'::date + INTERVAL '1 day'`;
            }
            return '1=1';
        case 'all_time':
        default:
            return '1=1';
    }
}

exports.getFuelAnalytics = async (req, res) => {
    const { range = 'all_time', startDate, endDate } = req.query;

    try {
        const tripDateCond = getDateCondition(range, startDate, endDate, 't.created_at');
        const fuelDateCond = getDateCondition(range, startDate, endDate, 'f.date');

        // 1. Overall Fleet Trip Estimated Metrics
        const tripEstQuery = `
            SELECT 
                COUNT(t.id)::int AS total_trips,
                COALESCE(SUM(t.estimated_fuel_liters), 0)::float AS total_estimated_fuel,
                COALESCE(SUM(t.estimated_fuel_cost), 0)::float AS total_estimated_cost,
                COALESCE(SUM(COALESCE(t.actual_distance, t.planned_distance, 0)), 0)::float AS total_distance
            FROM trips t
            WHERE ${tripDateCond}
        `;
        const tripEstRes = await pool.query(tripEstQuery);
        const tripEstData = tripEstRes.rows[0] || {};

        // 2. Overall Fleet Actual Fuel Metrics (from fuel ledger)
        const fuelActQuery = `
            SELECT 
                COUNT(f.id)::int AS total_fuel_bills,
                COALESCE(SUM(f.fuel_amount), 0)::float AS total_actual_fuel,
                COALESCE(SUM(f.cost), 0)::float AS total_actual_cost
            FROM fuel f
            WHERE ${fuelDateCond}
        `;
        const fuelActRes = await pool.query(fuelActQuery);
        const fuelActData = fuelActRes.rows[0] || {};

        const totalEstimatedFuel = tripEstData.total_estimated_fuel || 0;
        const totalActualFuel = fuelActData.total_actual_fuel || 0;
        const totalEstimatedCost = tripEstData.total_estimated_cost || 0;
        const totalActualCost = fuelActData.total_actual_cost || 0;
        const totalDistance = tripEstData.total_distance || 0;

        const fuelVarianceLiters = Math.round((totalActualFuel - totalEstimatedFuel) * 100) / 100;
        const fuelVariancePct = totalEstimatedFuel > 0 
            ? Math.round(((totalActualFuel - totalEstimatedFuel) / totalEstimatedFuel) * 10000) / 100 
            : 0;

        const costVarianceAmount = Math.round((totalActualCost - totalEstimatedCost) * 100) / 100;
        const costVariancePct = totalEstimatedCost > 0 
            ? Math.round(((totalActualCost - totalEstimatedCost) / totalEstimatedCost) * 10000) / 100 
            : 0;

        const fleetActualKmpl = totalActualFuel > 0 
            ? Math.round((totalDistance / totalActualFuel) * 100) / 100 
            : (totalEstimatedFuel > 0 ? Math.round((totalDistance / totalEstimatedFuel) * 100) / 100 : 0);

        const fleetEstimatedKmpl = totalEstimatedFuel > 0 
            ? Math.round((totalDistance / totalEstimatedFuel) * 100) / 100 
            : 0;

        const avgCostPerKm = totalDistance > 0 
            ? Math.round((totalActualCost / totalDistance) * 100) / 100 
            : 0;

        // 3. Vehicle-Wise Breakdown
        const vehicleQuery = `
            SELECT 
                v.id AS vehicle_id,
                v.registration_no,
                v.vehicle_name,
                v.fuel_type,
                v.fuel_efficiency_kmpl,
                COALESCE(t_agg.est_fuel, 0)::float AS estimated_fuel,
                COALESCE(t_agg.est_cost, 0)::float AS estimated_cost,
                COALESCE(t_agg.dist, 0)::float AS total_distance,
                COALESCE(f_agg.act_fuel, 0)::float AS actual_fuel,
                COALESCE(f_agg.act_cost, 0)::float AS actual_cost
            FROM vehicles v
            LEFT JOIN (
                SELECT 
                    vehicle_id,
                    SUM(COALESCE(estimated_fuel_liters, 0)) AS est_fuel,
                    SUM(COALESCE(estimated_fuel_cost, 0)) AS est_cost,
                    SUM(COALESCE(actual_distance, planned_distance, 0)) AS dist
                FROM trips t
                WHERE ${tripDateCond}
                GROUP BY vehicle_id
            ) t_agg ON t_agg.vehicle_id = v.id
            LEFT JOIN (
                SELECT 
                    vehicle_id,
                    SUM(COALESCE(fuel_amount, 0)) AS act_fuel,
                    SUM(COALESCE(cost, 0)) AS act_cost
                FROM fuel f
                WHERE ${fuelDateCond}
                GROUP BY vehicle_id
            ) f_agg ON f_agg.vehicle_id = v.id
            ORDER BY v.registration_no ASC
        `;
        const vehicleRes = await pool.query(vehicleQuery);

        const vehicleAnalytics = vehicleRes.rows.map(v => {
            const estFuel = v.estimated_fuel || 0;
            const actFuel = v.actual_fuel || 0;
            const estCost = v.estimated_cost || 0;
            const actCost = v.actual_cost || 0;
            const dist = v.total_distance || 0;

            const fuelVariance = Math.round((actFuel - estFuel) * 100) / 100;
            const costVariance = Math.round((actCost - estCost) * 100) / 100;
            const actualKmpl = actFuel > 0 ? Math.round((dist / actFuel) * 100) / 100 : 0;
            const costPerKm = dist > 0 ? Math.round((actCost / dist) * 100) / 100 : 0;

            return {
                vehicle_id: v.vehicle_id,
                registration_no: v.registration_no,
                vehicle_name: v.vehicle_name,
                fuel_type: v.fuel_type || 'Diesel',
                rated_efficiency_kmpl: parseFloat(v.fuel_efficiency_kmpl || 0),
                estimated_fuel: estFuel,
                actual_fuel: actFuel,
                fuel_variance: fuelVariance,
                estimated_cost: estCost,
                actual_cost: actCost,
                cost_variance: costVariance,
                total_distance: dist,
                actual_kmpl: actualKmpl,
                cost_per_km: costPerKm
            };
        });

        res.json({
            range,
            summary: {
                total_trips: tripEstData.total_trips || 0,
                total_fuel_bills: fuelActData.total_fuel_bills || 0,
                total_distance_km: totalDistance,
                total_estimated_fuel_liters: totalEstimatedFuel,
                total_actual_fuel_liters: totalActualFuel,
                fuel_variance_liters: fuelVarianceLiters,
                fuel_variance_percentage: fuelVariancePct,
                total_estimated_cost: totalEstimatedCost,
                total_actual_cost: totalActualCost,
                cost_variance_amount: costVarianceAmount,
                cost_variance_percentage: costVariancePct,
                fleet_actual_kmpl: fleetActualKmpl,
                fleet_estimated_kmpl: fleetEstimatedKmpl,
                avg_cost_per_km: avgCostPerKm
            },
            vehicles: vehicleAnalytics
        });

    } catch (err) {
        console.error("Error fetching fuel analytics:", err);
        res.status(500).json({ message: "Server error calculating fuel analytics" });
    }
};
