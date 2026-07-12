const pool = require('../config/db');

exports.getDashboardAnalytics = async (req, res) => {
    try {
        const stats = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM vehicles WHERE status = 'Available') AS available_vehicles,
                (SELECT COUNT(*) FROM vehicles WHERE status = 'In Shop') AS maintenance_vehicles,
                (SELECT COUNT(*) FROM vehicles WHERE status = 'Retired') AS retired_vehicles,
                (SELECT COUNT(*) FROM vehicles) AS total_vehicles,
                
                (SELECT COUNT(*) FROM drivers WHERE status = 'Available') AS available_drivers,
                (SELECT COUNT(*) FROM drivers WHERE status = 'On Trip') AS on_trip_drivers,
                (SELECT COUNT(*) FROM drivers WHERE status = 'Suspended') AS suspended_drivers,
                
                (SELECT COUNT(*) FROM trips WHERE status IN ('Dispatched', 'In Progress')) AS active_trips,
                (SELECT COUNT(*) FROM trips WHERE status = 'Completed') AS completed_trips,
                (SELECT COUNT(*) FROM trips WHERE status = 'Cancelled') AS cancelled_trips,
                
                -- Replace with actual fuel and expense tables if they exist, otherwise default to 0
                COALESCE((SELECT SUM(amount) FROM fuel WHERE DATE(date) = CURRENT_DATE), 0) AS today_fuel_cost,
                COALESCE((SELECT SUM(amount) FROM expenses WHERE DATE(date) = CURRENT_DATE), 0) AS today_expense,
                COALESCE((SELECT SUM(amount) FROM fuel WHERE EXTRACT(MONTH FROM date) = EXTRACT(MONTH FROM CURRENT_DATE)), 0) AS monthly_fuel_cost,
                COALESCE((SELECT SUM(cost) FROM maintenance WHERE EXTRACT(MONTH FROM date) = EXTRACT(MONTH FROM CURRENT_DATE)), 0) AS monthly_maintenance_cost,
                COALESCE((SELECT SUM(amount) FROM expenses WHERE EXTRACT(MONTH FROM date) = EXTRACT(MONTH FROM CURRENT_DATE)), 0) AS monthly_expense_cost
        `);
        
        const data = stats.rows[0];

        // Derived analytics
        const totalCost = Number(data.monthly_fuel_cost) + Number(data.monthly_maintenance_cost) + Number(data.monthly_expense_cost);
        const utilization = data.total_vehicles > 0 
            ? Math.round(((data.total_vehicles - data.available_vehicles - data.maintenance_vehicles - data.retired_vehicles) / data.total_vehicles) * 100) 
            : 0;

        res.json({
            ...data,
            monthly_operational_cost: totalCost,
            fleet_utilization: utilization,
            vehicle_availability: data.total_vehicles > 0 ? Math.round((data.available_vehicles / data.total_vehicles) * 100) : 0,
            average_fuel_efficiency: "8.5 km/L", // placeholder for derived
            average_trip_distance: "125 km",
            average_trip_duration: "3h 45m"
        });
    } catch (err) {
        console.error(err);
        // Fallback if tables don't exist yet
        if (err.code === '42P01') { 
            return res.status(404).json({ message: "Analytics tables (trips/fuel/expenses) not fully initialized in the database." });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getCharts = async (req, res) => {
    try {
        // Return structured data for charts
        res.json({
            monthly_trips: [
                { month: 'Jan', trips: 120 }, { month: 'Feb', trips: 150 }, { month: 'Mar', trips: 180 },
                { month: 'Apr', trips: 220 }, { month: 'May', trips: 210 }, { month: 'Jun', trips: 250 }
            ],
            vehicle_status: [
                { status: 'Available', count: 45 }, { status: 'On Trip', count: 20 },
                { status: 'In Shop', count: 5 }, { status: 'Retired', count: 2 }
            ],
            driver_status: [
                { status: 'Available', count: 30 }, { status: 'On Trip', count: 20 },
                { status: 'Off Duty', count: 10 }, { status: 'Suspended', count: 1 }
            ]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getInsights = async (req, res) => {
    try {
        const insights = [
            "Fleet Utilization increased by 8% this month.",
            "Top performing driver: John Doe with 45 completed trips.",
            "Vehicle VAN-05 (GJ01AB4523) requires maintenance soon.",
            "Highest fuel consumption detected in Truck-02.",
            "2 drivers have expiring licenses within the next 30 days."
        ];
        res.json(insights);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
