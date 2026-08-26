const FinancialAnalyticsService = require('../services/financial_analytics.service');
const FuelPriceService = require('../services/fuel_price.service');
const pool = require('../config/db');

exports.getDashboardData = async (req, res) => {
    try {
        const filters = {
            period: req.query.period,
            startDate: req.query.startDate || req.query.dateFrom,
            endDate: req.query.endDate || req.query.dateTo,
            vehicleId: req.query.vehicleId,
            driverId: req.query.driverId
        };

        const overview = await FinancialAnalyticsService.getDashboardOverview(filters);

        // Fetch fuel prices via authoritative FuelPriceService
        let dieselObj = { pricePerLitre: 92.43 };
        let petrolObj = { pricePerLitre: 100.75 };
        try {
            dieselObj = await FuelPriceService.getCurrentFuelPrice({ city: 'Chennai', fuelType: 'DIESEL' });
            petrolObj = await FuelPriceService.getCurrentFuelPrice({ city: 'Chennai', fuelType: 'PETROL' });
        } catch (fErr) {
            console.warn('[Dashboard] FuelPriceService warning:', fErr.message);
        }

        res.json({
            ...overview,
            fuel_prices: {
                Diesel: {
                    price: dieselObj.pricePerLitre,
                    updated_at: dieselObj.fetchedAt || new Date().toISOString(),
                    isStale: dieselObj.isStale || false,
                    source: dieselObj.source || 'IOCL'
                },
                Petrol: {
                    price: petrolObj.pricePerLitre,
                    updated_at: petrolObj.fetchedAt || new Date().toISOString(),
                    isStale: petrolObj.isStale || false,
                    source: petrolObj.source || 'IOCL'
                }
            }
        });
    } catch (err) {
        console.error('Error in getDashboardData:', err);
        res.status(500).json({ message: 'Server error fetching dashboard metrics.' });
    }
};
