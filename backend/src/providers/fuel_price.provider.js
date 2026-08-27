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
    /**
     * Fetches real-time fuel prices for all fuel types (Diesel, Petrol, CNG, Electric).
     * Uses API key (process.env.FUEL_PRICE_API_KEY) or live web scraper.
     * Fills any missing fuel types with realistic reference/mock data.
     */
    static async fetchAllRates(city = 'Chennai', state = 'Tamil Nadu') {
        const apiKey = process.env.FUEL_PRICE_API_KEY || 'sk-live-8ZtkYfYqz1CZEWKxplFB8HRazQlLBxijaX7HF5az';
        
        // Base reference mock data for missing fuels or fallbacks
        const defaultMockData = {
            Diesel:   { price: 99.55,  unit: 'per litre', source: 'Reference (Chennai)', live: false },
            Petrol:   { price: 107.76, unit: 'per litre', source: 'Reference (Chennai)', live: false },
            CNG:      { price: 97.00,  unit: 'per kg',    source: 'Reference (Chennai)', live: false },
            Electric: { price: 9.50,   unit: 'per kWh',   source: 'Reference (India avg)', live: false }
        };

        const resultRates = { ...defaultMockData };

        // 1. Try API Key request first if configured
        if (apiKey && apiKey.trim() !== '') {
            try {
                const apiData = await this.fetchFromApi(apiKey, city, state);
                if (apiData && typeof apiData === 'object') {
                    if (apiData.Diesel && this._isPriceValid(apiData.Diesel)) {
                        resultRates.Diesel = { price: apiData.Diesel, unit: 'per litre', source: 'Live API', live: true };
                    }
                    if (apiData.Petrol && this._isPriceValid(apiData.Petrol)) {
                        resultRates.Petrol = { price: apiData.Petrol, unit: 'per litre', source: 'Live API', live: true };
                    }
                    if (apiData.CNG && this._isPriceValid(apiData.CNG)) {
                        resultRates.CNG = { price: apiData.CNG, unit: 'per kg', source: 'Live API', live: true };
                    }
                    if (apiData.Electric && this._isPriceValid(apiData.Electric)) {
                        resultRates.Electric = { price: apiData.Electric, unit: 'per kWh', source: 'Live API', live: true };
                    }
                }
            } catch (apiErr) {
                console.warn(`[FuelPriceProvider] API key call failed (${apiErr.message}), falling back to live scraper/reference data.`);
            }
        }

        // 2. Scrape live Diesel & Petrol if API didn't provide live data for them
        if (!resultRates.Diesel.live || !resultRates.Petrol.live) {
            try {
                const scrapedPetrol = await this.scrapeGoodReturns(city, 'petrol');
                if (scrapedPetrol?.price) {
                    resultRates.Petrol = { price: scrapedPetrol.price, unit: 'per litre', source: 'Goodreturns (Live)', live: true };
                }
            } catch (err) {}

            try {
                const scrapedDiesel = await this.scrapeGoodReturns(city, 'diesel');
                if (scrapedDiesel?.price) {
                    resultRates.Diesel = { price: scrapedDiesel.price, unit: 'per litre', source: 'Goodreturns (Live)', live: true };
                }
            } catch (err) {}
        }

        return resultRates;
    }

    /**
     * Fetches the real current fuel price for a given city and fuel type.
     */
    static async fetchPrice(city, state, fuelType) {
        const rates = await this.fetchAllRates(city, state);
        const normKey = fuelType.charAt(0).toUpperCase() + fuelType.slice(1).toLowerCase();
        if (rates[normKey]) {
            return { price: rates[normKey].price, source: rates[normKey].source };
        }
        return { price: 100.00, source: 'Default Reference' };
    }

    /**
     * API request handler using configured API Key.
     */
    static async fetchFromApi(apiKey, city, state) {
        // Safe check for API endpoint responses
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.collectapi.com',
                path: `/gasPrice/stateFuelPrice?state=${encodeURIComponent(state)}`,
                method: 'GET',
                headers: {
                    'content-type': 'application/json',
                    'authorization': `apikey ${apiKey}`
                },
                timeout: 5000
            };

            const req = https.request(options, (res) => {
                let body = '';
                res.on('data', chunk => { body += chunk; });
                res.on('end', () => {
                    try {
                        const json = JSON.parse(body);
                        if (json.success && json.result && Array.isArray(json.result)) {
                            const map = {};
                            json.result.forEach(item => {
                                if (item.name === 'Diesel') map.Diesel = parseFloat(item.price);
                                if (item.name === 'Gasoline' || item.name === 'Petrol') map.Petrol = parseFloat(item.price);
                            });
                            return resolve(map);
                        }
                        reject(new Error(json.message || `API returned status ${res.statusCode}`));
                    } catch (e) {
                        reject(e);
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => { req.destroy(); reject(new Error('API request timeout')); });
            req.end();
        });
    }
}

module.exports = FuelPriceProvider;
