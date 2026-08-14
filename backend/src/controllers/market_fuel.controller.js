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

/**
 * GET /api/fuel-price/market-rates
 * Returns today's live market rates for Diesel, Petrol, CNG, Electric.
 * Caches for 12 hours. Falls back to verified reference rates on any error.
 */
exports.getMarketRates = async (req, res) => {
    const now = Date.now();

    // Return from cache if still valid
    if (rateCache && (now - cacheTimestamp) < CACHE_TTL_MS) {
        return res.json({
            success: true,
            cached: true,
            fetched_at: new Date(cacheTimestamp).toISOString(),
            rates: rateCache
        });
    }

    try {
        const { petrol, diesel } = await fetchLiveRates();

        rateCache = {
            Diesel:   { price: diesel,  unit: 'per litre', source: 'Live (Chennai, Goodreturns)', live: true },
            Petrol:   { price: petrol,  unit: 'per litre', source: 'Live (Chennai, Goodreturns)', live: true },
            CNG:      { price: FALLBACK_RATES.CNG.price,      unit: 'per kg',  source: FALLBACK_RATES.CNG.source,      live: false },
            Electric: { price: FALLBACK_RATES.Electric.price, unit: 'per kWh', source: FALLBACK_RATES.Electric.source, live: false },
        };
        cacheTimestamp = now;

        console.log(`[MarketFuel] Live rates fetched: Diesel=₹${diesel} Petrol=₹${petrol}`);
        return res.json({
            success: true,
            cached: false,
            fetched_at: new Date(now).toISOString(),
            rates: rateCache
        });

    } catch (err) {
        console.warn('[MarketFuel] Live fetch failed, using fallback:', err.message);

        // Use fallback but don't write to rateCache (try fresh next time)
        return res.json({
            success: true,
            cached: false,
            fallback: true,
            fetched_at: new Date(now).toISOString(),
            rates: {
                Diesel:   { ...FALLBACK_RATES.Diesel,   live: false },
                Petrol:   { ...FALLBACK_RATES.Petrol,   live: false },
                CNG:      { ...FALLBACK_RATES.CNG,      live: false },
                Electric: { ...FALLBACK_RATES.Electric, live: false },
            }
        });
    }
};
