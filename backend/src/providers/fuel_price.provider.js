const https = require('https');

class FuelPriceProvider {
    /**
     * Makes an HTTPS GET request and returns the response body.
     */
    static _httpGet(options) {
        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let body = '';
                res.on('data', chunk => { body += chunk; });
                res.on('end', () => {
                    if (res.statusCode >= 400) {
                        return reject(new Error(`HTTP ${res.statusCode} from ${options.hostname}${options.path}`));
                    }
                    resolve(body);
                });
            });
            req.on('error', reject);
            req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
            req.end();
        });
    }

    /**
     * Scrapes goodreturns.in for city fuel prices.
     * Supports PETROL and DIESEL for Indian cities.
     */
    static async scrapeGoodReturns(city, fuelType) {
        const fuelPath = fuelType.toLowerCase() === 'petrol' ? 'petrol-price' : 'diesel-price';
        const cityPath = city.toLowerCase().replace(/\s+/g, '-');

        const options = {
            hostname: 'www.goodreturns.in',
            path: `/fuel-price/${fuelPath}-in-${cityPath}/`,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            },
            timeout: 10000
        };

        const body = await this._httpGet(options);

        // Try multiple patterns to find the price
        // Pattern 1: data-fuel-price attribute (most reliable)
        const attrMatch = body.match(/data-fuel-price[^"]*"(\d{2,3}\.\d{2})"/i);
        if (attrMatch) {
            const price = parseFloat(attrMatch[1]);
            if (this._isPriceValid(price)) {
                return { price, source: 'Goodreturns (Live)' };
            }
        }

        // Pattern 2: JSON-LD or structured data
        const jsonLdMatch = body.match(/"price"\s*:\s*"?(\d{2,3}\.\d{2})"?/);
        if (jsonLdMatch) {
            const price = parseFloat(jsonLdMatch[1]);
            if (this._isPriceValid(price)) {
                return { price, source: 'Goodreturns (Live)' };
            }
        }

        // Pattern 3: ₹ symbol followed by price (most common HTML pattern)
        // Use a RegExp constructor to avoid literal character issues
        const rupeePattern = new RegExp('\u20b9\\s*(\\d{2,3}\\.\\d{2})', 'g');
        const rupeeMatches = [...body.matchAll(rupeePattern)];
        for (const m of rupeeMatches) {
            const price = parseFloat(m[1]);
            if (this._isPriceValid(price)) {
                return { price, source: 'Goodreturns (Live)' };
            }
        }

        // Pattern 4: Look for text mentioning the fuel type near a price
        const fuelTypeLower = fuelType.toLowerCase();
        const contextPattern = new RegExp(
            `${fuelTypeLower}[\\s\\S]{0,500}?(\\d{2,3}\\.\\d{2})`,
            'i'
        );
        const contextMatch = body.match(contextPattern);
        if (contextMatch) {
            const price = parseFloat(contextMatch[1]);
            if (this._isPriceValid(price)) {
                return { price, source: 'Goodreturns (Live)' };
            }
        }

        throw new Error(`Could not parse ${fuelType} price for ${city} from Goodreturns`);
    }

    /**
     * Validates that a fuel price is within a reasonable range for India.
     * Diesel and Petrol in India typically range from ₹70–₹160.
     */
    static _isPriceValid(price) {
        return typeof price === 'number' && !isNaN(price) && price >= 50 && price <= 200;
    }

    /**
     * Fetches the real current fuel price for a given city and fuel type.
     * If FUEL_PRICE_API_KEY is set, uses the configured API provider.
     * Otherwise falls back to Goodreturns scraping.
     * 
     * @param {string} city 
     * @param {string} state 
     * @param {string} fuelType 'DIESEL' or 'PETROL'
     * @returns {{ price: number, source: string }}
     */
    static async fetchPrice(city, state, fuelType) {
        const apiKey = process.env.FUEL_PRICE_API_KEY;

        // If a real API key is configured, use it first
        if (apiKey && apiKey.trim() !== '') {
            try {
                return await this.fetchFromApi(apiKey, city, state, fuelType);
            } catch (err) {
                console.warn(`[FuelPriceProvider] API fetch failed, falling back to scraper: ${err.message}`);
            }
        }

        // Scrape Goodreturns as primary source when no API key
        console.log(`[FuelPriceProvider] Scraping live ${fuelType} price for ${city}, ${state}...`);
        return await this.scrapeGoodReturns(city, fuelType);
    }

    /**
     * Placeholder for a real API provider integration.
     * Set FUEL_PRICE_API_KEY in .env to enable this path.
     */
    static async fetchFromApi(apiKey, city, state, fuelType) {
        // Example: integrate with a fuel price API here
        // const url = `https://api.example.com/fuel?city=${city}&type=${fuelType}&key=${apiKey}`;
        // const res = await fetch(url);
        // const data = await res.json();
        // return { price: data.price, source: 'FuelPriceAPI' };
        throw new Error('No API provider configured. Set FUEL_PRICE_API_KEY in .env and implement fetchFromApi().');
    }
}

module.exports = FuelPriceProvider;
