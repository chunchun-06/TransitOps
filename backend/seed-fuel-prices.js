require('dotenv').config();
const pool = require('./src/config/db');

async function seedFuelPrices() {
    const prices = [
        ['Chennai', 'DIESEL', 92.43],
        ['Chennai', 'PETROL', 100.75],
        ['Coimbatore', 'DIESEL', 92.95],
        ['Coimbatore', 'PETROL', 101.40],
        ['Bangalore', 'DIESEL', 87.89],
        ['Bangalore', 'PETROL', 99.84],
        ['Delhi', 'DIESEL', 87.62],
        ['Delhi', 'PETROL', 94.72],
        ['Mumbai', 'DIESEL', 92.15],
        ['Mumbai', 'PETROL', 104.21],
        ['Hyderabad', 'DIESEL', 95.65],
        ['Hyderabad', 'PETROL', 107.41]
    ];

    try {
        const client = await pool.connect();
        for (const [city, type, price] of prices) {
            await client.query(`
                INSERT INTO fuel_prices (fuel_type, country, state, city, price_per_litre, effective_date, source)
                VALUES ($1, 'India', 'Tamil Nadu', $2, $3, CURRENT_DATE - INTERVAL '1 day', 'Market Reference')
                ON CONFLICT (city, fuel_type, effective_date) DO UPDATE SET price_per_litre = EXCLUDED.price_per_litre
            `, [type, city, price]);
        }
        client.release();
        console.log('✅ Baseline fuel prices seeded successfully!');
    } catch (err) {
        console.error('❌ Error seeding fuel prices:', err);
    } finally {
        process.exit(0);
    }
}

seedFuelPrices();
