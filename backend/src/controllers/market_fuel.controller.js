/**
 * Market Fuel Rate Controller
 * Fetches live Indian market fuel prices via a backend HTTP request,
 * caches results for 12 hours to avoid hammering external sources.
 * Falls back to latest known prices if the fetch fails.
 */

const https = require('https');

// 12-hour in-memory cache
let rateCache = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

/**
 * Verified reference rates (August 2026, Chennai, Tamil Nadu)
 * Source: goodreturns.in, dtnext.in — updated 14 Aug 2026
 */
const FALLBACK_RATES = {
    Diesel:   { price: 99.55,  unit: 'per litre', source: 'Reference (Chennai, Aug 2026)' },
    Petrol:   { price: 107.77, unit: 'per litre', source: 'Reference (Chennai, Aug 2026)' },
    CNG:      { price: 97.00,  unit: 'per kg',    source: 'Reference (Chennai, Aug 2026)' },
    Electric: { price: 9.50,   unit: 'per kWh',   source: 'Reference (India avg, Aug 2026)' },
};

/**
 * Attempt to scrape Goodreturns for Chennai diesel/petrol prices.
 * Uses a simple regex match on the returned HTML.
 */
const fetchLiveRates = () => new Promise((resolve, reject) => {
    const options = {
        hostname: 'www.goodreturns.in',
        path: '/fuel-price/petrol-price-in-chennai/',
        method: 'GET',
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; TransitOpsBot/1.0)',
            'Accept': 'text/html'
        },
        timeout: 6000
    };

    const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
            try {
                // Match price patterns like ₹107.77 or 107.77
                const petrolMatch = body.match(/petrol[\s\S]{0,300}?₹?\s*(\d{2,3}\.\d{2})/i);
                const dieselMatch = body.match(/diesel[\s\S]{0,300}?₹?\s*(\d{2,3}\.\d{2})/i);

                const petrol = petrolMatch ? parseFloat(petrolMatch[1]) : null;
                const diesel = dieselMatch ? parseFloat(dieselMatch[1]) : null;

                if (petrol && diesel && petrol > 50 && diesel > 50) {
                    resolve({ petrol, diesel });
                } else {
                    reject(new Error('Could not parse prices from page'));
                }
            } catch (e) {
                reject(e);
            }
        });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    req.end();
});

const pool = require('../config/db');

/**
 * GET /api/market-fuel/rates (or /api/fuel-price/market-rates)
 * Returns today's live market rates for Diesel, Petrol, CNG, Electric for Chennai.
 * Caches in fuel_prices table. Falls back to latest cached values with is_stale: true if live fetch fails.
 */
const FuelPriceProvider = require('../providers/fuel_price.provider');

exports.getMarketRates = async (req, res) => {
    const now = Date.now();

    // Check 12-hour in-memory cache first
    if (rateCache && (now - cacheTimestamp) < CACHE_TTL_MS) {
        return res.json({
            success: true,
            cached: true,
            is_stale: false,
            fetched_at: new Date(cacheTimestamp).toISOString(),
            rates: rateCache
        });
    }

    try {
        const rates = await FuelPriceProvider.fetchAllRates('Chennai', 'Tamil Nadu');

        // Live/Provider fetch succeeded -> Upsert into fuel_prices table
        const today = new Date().toISOString().split('T')[0];
        
        try {
            await pool.query(
                `INSERT INTO fuel_prices (fuel_type, country, state, city, price_per_litre, effective_date, source, fetched_at)
                 VALUES ('DIESEL', 'India', 'Tamil Nadu', 'Chennai', $1, $5, $6, CURRENT_TIMESTAMP),
                        ('PETROL', 'India', 'Tamil Nadu', 'Chennai', $2, $5, $7, CURRENT_TIMESTAMP),
                        ('CNG', 'India', 'Tamil Nadu', 'Chennai', $3, $5, $8, CURRENT_TIMESTAMP),
                        ('ELECTRIC', 'India', 'Tamil Nadu', 'Chennai', $4, $5, $9, CURRENT_TIMESTAMP)
                 ON CONFLICT (city, fuel_type, effective_date) DO UPDATE 
                 SET price_per_litre = EXCLUDED.price_per_litre, fetched_at = CURRENT_TIMESTAMP, source = EXCLUDED.source`,
                [
                    rates.Diesel.price,
                    rates.Petrol.price,
                    rates.CNG.price,
                    rates.Electric.price,
                    today,
                    rates.Diesel.source,
                    rates.Petrol.source,
                    rates.CNG.source,
                    rates.Electric.source
                ]
            );
        } catch (dbErr) {
            console.warn('[MarketFuel] Error caching rates to DB:', dbErr.message);
        }

        rateCache = rates;
        cacheTimestamp = now;

        console.log(`[MarketFuel] Chennai rates updated: Diesel=₹${rates.Diesel.price} Petrol=₹${rates.Petrol.price} CNG=₹${rates.CNG.price} Electric=₹${rates.Electric.price}`);
        return res.json({
            success: true,
            cached: false,
            is_stale: false,
            fetched_at: new Date(now).toISOString(),
            rates: rateCache
        });

    } catch (err) {
        console.warn('[MarketFuel] Live fetch failed, reading latest cached values from fuel_prices DB:', err.message);

        try {
            // Read latest cached prices from DB table `fuel_prices`
            const dbRes = await pool.query(
                `SELECT DISTINCT ON (UPPER(fuel_type)) fuel_type, price_per_litre, source, fetched_at
                 FROM fuel_prices
                 WHERE LOWER(city) = 'chennai'
                 ORDER BY UPPER(fuel_type), effective_date DESC, fetched_at DESC`
            );

            if (dbRes.rows.length > 0) {
                const dbRates = { ...FALLBACK_RATES };
                let latestFetchedAt = null;

                dbRes.rows.forEach(row => {
                    const ft = row.fuel_type.toUpperCase();
                    const key = ft === 'DIESEL' ? 'Diesel' : ft === 'PETROL' ? 'Petrol' : ft === 'CNG' ? 'CNG' : 'Electric';
                    if (dbRates[key]) {
                        dbRates[key] = {
                            price: parseFloat(row.price_per_litre),
                            unit: dbRates[key].unit,
                            source: row.source || 'Cached DB Reference',
                            live: false,
                            is_stale: true,
                            fetched_at: row.fetched_at
                        };
                        if (!latestFetchedAt || new Date(row.fetched_at) > new Date(latestFetchedAt)) {
                            latestFetchedAt = row.fetched_at;
                        }
                    }
                });

                return res.json({
                    success: true,
                    cached: true,
                    is_stale: true,
                    fetched_at: latestFetchedAt || new Date().toISOString(),
                    rates: dbRates
                });
            }
        } catch (dbReadErr) {
            console.error('[MarketFuel] DB fallback read error:', dbReadErr.message);
        }

        // Final fallback to verified reference rates
        return res.json({
            success: true,
            cached: false,
            is_stale: true,
            fetched_at: new Date().toISOString(),
            rates: {
                Diesel:   { ...FALLBACK_RATES.Diesel,   live: false, is_stale: true },
                Petrol:   { ...FALLBACK_RATES.Petrol,   live: false, is_stale: true },
                CNG:      { ...FALLBACK_RATES.CNG,      live: false, is_stale: true },
                Electric: { ...FALLBACK_RATES.Electric, live: false, is_stale: true },
            }
        });
    }
};
