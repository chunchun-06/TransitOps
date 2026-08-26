const pool = require('../config/db');
const FuelPriceProvider = require('../providers/fuel_price.provider');

class FuelPriceService {
    static async getCurrentFuelPrice({ city = 'Chennai', state = 'Tamil Nadu', fuelType = 'DIESEL' }) {
        const today = new Date().toISOString().split('T')[0];
        const normalizedFuelType = fuelType.toUpperCase();
        
        // 1. Check if today's price exists in DB (Cache)
        const cachedRes = await pool.query(
            `SELECT * FROM fuel_prices 
             WHERE LOWER(city) = LOWER($1) AND UPPER(fuel_type) = $2 AND effective_date = $3 
             LIMIT 1`,
            [city, normalizedFuelType, today]
        );

        if (cachedRes.rows.length > 0) {
            return {
                city,
                state,
                fuelType: normalizedFuelType,
                pricePerLitre: parseFloat(cachedRes.rows[0].price_per_litre),
                currency: cachedRes.rows[0].currency,
                effectiveDate: cachedRes.rows[0].effective_date.toISOString().split('T')[0],
                source: cachedRes.rows[0].source,
                fetchedAt: cachedRes.rows[0].fetched_at,
                isStale: false
            };
        }

        // 2. Not in cache -> Fetch from Provider
        try {
            const liveData = await FuelPriceProvider.fetchPrice(city, state, normalizedFuelType);
            
            // 3. Save to DB
            const insertRes = await pool.query(
                `INSERT INTO fuel_prices (fuel_type, country, state, city, price_per_litre, effective_date, source)
                 VALUES ($1, 'India', $2, $3, $4, $5, $6)
                 ON CONFLICT (city, fuel_type, effective_date) DO UPDATE 
                 SET price_per_litre = EXCLUDED.price_per_litre, fetched_at = CURRENT_TIMESTAMP
                 RETURNING *`,
                [normalizedFuelType, state, city, liveData.price, today, liveData.source]
            );

            return {
                city,
                state,
                fuelType: normalizedFuelType,
                pricePerLitre: parseFloat(insertRes.rows[0].price_per_litre),
                currency: insertRes.rows[0].currency,
                effectiveDate: insertRes.rows[0].effective_date.toISOString().split('T')[0],
                source: insertRes.rows[0].source,
                fetchedAt: insertRes.rows[0].fetched_at,
                isStale: false
            };
            
        } catch (error) {
            console.error(`[FuelPriceService] Failed to fetch live price for ${city} ${normalizedFuelType}:`, error.message);
            
            // 4. Provider failed -> Fetch most recent historical price (Stale Data Fallback)
            const historicalRes = await pool.query(
                `SELECT * FROM fuel_prices 
                 WHERE LOWER(city) = LOWER($1) AND UPPER(fuel_type) = $2 
                 ORDER BY effective_date DESC 
                 LIMIT 1`,
                [city, normalizedFuelType]
            );

            if (historicalRes.rows.length > 0) {
                return {
                    city,
                    state,
                    fuelType: normalizedFuelType,
                    pricePerLitre: parseFloat(historicalRes.rows[0].price_per_litre),
                    currency: historicalRes.rows[0].currency,
                    effectiveDate: historicalRes.rows[0].effective_date.toISOString().split('T')[0],
                    source: historicalRes.rows[0].source,
                    fetchedAt: historicalRes.rows[0].fetched_at,
                    isStale: true
                };
            }

            // 5. No historical data exists
            throw new Error(`Current fuel price unavailable for ${city} ${normalizedFuelType}.`);
        }
    }

    static async getPriceForDate(city, fuelType, targetDate) {
        // Find price closest to (but not after) targetDate
        const res = await pool.query(
            `SELECT * FROM fuel_prices 
             WHERE LOWER(city) = LOWER($1) AND UPPER(fuel_type) = $2 AND effective_date <= $3
             ORDER BY effective_date DESC 
             LIMIT 1`,
            [city, fuelType.toUpperCase(), targetDate]
        );
        
        if (res.rows.length > 0) {
            return parseFloat(res.rows[0].price_per_litre);
        }
        
        return null;
    }
}

module.exports = FuelPriceService;
