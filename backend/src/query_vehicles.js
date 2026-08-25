const pool = require('./config/db');

async function check() {
    try {
        const res = await pool.query('SELECT id, registration_no, vehicle_name, fuel_efficiency_kmpl, fuel_tank_capacity_liters, current_fuel_level_liters, max_load_capacity, fuel_type FROM vehicles');
        console.log('Vehicles in Database:');
        console.log(JSON.stringify(res.rows, null, 2));
    } catch(err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
check();
