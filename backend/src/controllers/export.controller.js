const FinancialAnalyticsService = require('../services/financial_analytics.service');
const pool = require('../config/db');
const PDFDocument = require('pdfkit');

exports.exportCSV = async (req, res) => {
    try {
        const filters = {
            period: req.query.period,
            startDate: req.query.startDate || req.query.dateFrom,
            endDate: req.query.endDate || req.query.dateTo,
            vehicleId: req.query.vehicleId,
            driverId: req.query.driverId,
            status: req.query.status
        };

        const metrics = await FinancialAnalyticsService.getFinancialMetrics(filters);
        const overview = await FinancialAnalyticsService.getDashboardOverview(filters);
        const charts = await FinancialAnalyticsService.getChartsData(filters);

        const tripsRes = await pool.query(`
            SELECT 
                t.id, t.created_at, t.source, t.destination, t.status,
                t.revenue, t.actual_fuel_cost,
                COALESCE((SELECT SUM(amount) FROM expenses WHERE trip_id = t.id AND UPPER(category) = 'TOLL'), t.toll_amount, 0) AS toll_amount,
                v.registration_no, d.name AS driver_name
            FROM trips t
            LEFT JOIN vehicles v ON t.vehicle_id = v.id
            LEFT JOIN drivers d ON t.driver_id = d.id
            ORDER BY t.created_at DESC
            LIMIT 100
        `);

        let csvRows = [];
        csvRows.push("TransitOps Fleet Management & Financial Report");
        csvRows.push(`Generated Date,${new Date().toISOString()}`);
        csvRows.push(`Period Filter,${filters.period || 'All Time'}`);
        if (filters.startDate) csvRows.push(`Start Date,${filters.startDate}`);
        if (filters.endDate) csvRows.push(`End Date,${filters.endDate}`);
        csvRows.push("");

        csvRows.push("FINANCIAL METRICS SUMMARY,VALUE (INR)");
        csvRows.push(`Total Revenue,${metrics.total_revenue.toFixed(2)}`);
        csvRows.push(`Fuel Costs,${metrics.total_fuel_cost.toFixed(2)}`);
        csvRows.push(`Maintenance Costs,${metrics.total_maintenance_cost.toFixed(2)}`);
        csvRows.push(`Toll Costs,${metrics.total_toll_cost.toFixed(2)}`);
        csvRows.push(`General Operating Expenses,${metrics.total_other_expenses.toFixed(2)}`);
        csvRows.push(`Total Operating Expenses,${metrics.total_expenses.toFixed(2)}`);
        csvRows.push(`Net Result,${metrics.net_result.toFixed(2)}`);
        csvRows.push(`Net Profit,${metrics.profit.toFixed(2)}`);
        csvRows.push(`Net Loss,${metrics.loss.toFixed(2)}`);
        csvRows.push(`Cost Per KM,${metrics.cost_per_km.toFixed(2)}`);
        csvRows.push(`Avg Fuel Efficiency (km/L),${metrics.fuel_efficiency.toFixed(2)}`);
        csvRows.push("");

        csvRows.push("OPERATIONAL METRICS,VALUE");
        csvRows.push(`Total Vehicles,${overview.operational.total_vehicles}`);
        csvRows.push(`Available Vehicles,${overview.operational.available_vehicles}`);
        csvRows.push(`On Trip Vehicles,${overview.operational.on_trip_vehicles}`);
        csvRows.push(`Maintenance Vehicles,${overview.operational.maintenance_vehicles}`);
        csvRows.push(`Fleet Utilization,${overview.operational.fleet_utilization}%`);
        csvRows.push(`Vehicle Availability,${overview.operational.vehicle_availability}%`);
        csvRows.push(`Total Drivers,${overview.operational.total_drivers}`);
        csvRows.push(`Total Trips,${metrics.total_trips}`);
        csvRows.push(`Completed Trips,${metrics.completed_trips}`);
        csvRows.push(`Active Trips,${metrics.active_trips}`);
        csvRows.push("");

        csvRows.push("EXPENSE CATEGORY BREAKDOWN,AMOUNT (INR)");
        charts.expense_breakdown.forEach(item => {
            csvRows.push(`${item.category},${item.amount.toFixed(2)}`);
        });
        csvRows.push("");

        csvRows.push("ITEMIZED TRIP TRANSACTIONS (RECONCILED)");
        csvRows.push("TRIP ID,CREATED DATE,VEHICLE,DRIVER,STATUS,SOURCE,DESTINATION,REVENUE (INR),FUEL COST (INR),TOLL (INR)");
        tripsRes.rows.forEach(t => {
            csvRows.push(`TR-${String(t.id).substring(0,6).toUpperCase()},${t.created_at ? new Date(t.created_at).toISOString().split('T')[0] : ''},${t.registration_no || ''},"${t.driver_name || ''}",${t.status},"${t.source || ''}","${t.destination || ''}",${parseFloat(t.revenue || 0).toFixed(2)},${parseFloat(t.actual_fuel_cost || 0).toFixed(2)},${parseFloat(t.toll_amount || 0).toFixed(2)}`);
        });

        const filename = `transitops_report_${new Date().toISOString().slice(0, 10)}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.status(200).send(csvRows.join("\n"));
    } catch (err) {
        console.error('Error in exportCSV:', err);
        res.status(500).json({ message: 'Failed to export CSV report' });
    }
};

exports.exportPDF = async (req, res) => {
    try {
        const filters = {
            period: req.query.period,
            startDate: req.query.startDate || req.query.dateFrom,
            endDate: req.query.endDate || req.query.dateTo,
            vehicleId: req.query.vehicleId,
            driverId: req.query.driverId,
            status: req.query.status
        };

        const metrics = await FinancialAnalyticsService.getFinancialMetrics(filters);
        const overview = await FinancialAnalyticsService.getDashboardOverview(filters);
        const insights = await FinancialAnalyticsService.getInsights(filters);

        const filename = `transitops_report_${new Date().toISOString().slice(0, 10)}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        const doc = new PDFDocument({ margin: 40 });
        doc.pipe(res);

        // Header
        doc.fillColor('#C98A1C').fontSize(22).text('TransitOps', { inline: true });
        doc.fillColor('#333333').fontSize(14).text(' Enterprise Fleet Management & Financial Report', { underline: false });
        doc.fillColor('#666666').fontSize(9).text(`Generated: ${new Date().toLocaleString()}  |  Period: ${filters.period || 'All Time'}`);
        doc.moveDown(0.5);
        doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(40, doc.y).lineTo(570, doc.y).stroke();
        doc.moveDown(1);

        // Section 1: Financial Summary Card
        doc.fillColor('#1A202C').fontSize(12).text('Financial Performance Summary', { bold: true });
        doc.moveDown(0.5);

        doc.fontSize(10).fillColor('#4A5568');
        doc.text(`Total Revenue: INR ₹ ${metrics.total_revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
        doc.text(`Fuel Costs: INR ₹ ${metrics.total_fuel_cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
        doc.text(`Maintenance Costs: INR ₹ ${metrics.total_maintenance_cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
        doc.text(`Toll & General Expenses: INR ₹ ${(metrics.total_toll_cost + metrics.total_other_expenses).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
        doc.text(`Total Operating Expenses: INR ₹ ${metrics.total_expenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
        
        doc.moveDown(0.3);
        if (metrics.profit > 0) {
            doc.fillColor('#10B981').text(`Net Profit: + INR ₹ ${metrics.profit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
        } else if (metrics.loss > 0) {
            doc.fillColor('#EF4444').text(`Net Loss: - INR ₹ ${metrics.loss.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
        } else {
            doc.fillColor('#718096').text('Net Result: Breakeven (₹ 0.00)');
        }

        doc.fillColor('#4A5568');
        doc.text(`Cost Per KM: ₹ ${metrics.cost_per_km.toFixed(2)} / km`);
        doc.text(`Average Fleet Fuel Efficiency: ${metrics.fuel_efficiency.toFixed(2)} km/L`);
        doc.moveDown(1);

        // Section 2: Operational Metrics
        doc.fillColor('#1A202C').fontSize(12).text('Operational & Fleet Metrics', { bold: true });
        doc.moveDown(0.5);

        doc.fontSize(10).fillColor('#4A5568');
        doc.text(`Total Vehicles: ${overview.operational.total_vehicles} (Available: ${overview.operational.available_vehicles}, On Trip: ${overview.operational.on_trip_vehicles}, In Maintenance: ${overview.operational.maintenance_vehicles})`);
        doc.text(`Fleet Utilization Rate: ${overview.operational.fleet_utilization}%  |  Vehicle Availability: ${overview.operational.vehicle_availability}%`);
        doc.text(`Total Active Drivers: ${overview.operational.total_drivers}`);
        doc.text(`Trips Summary: ${metrics.total_trips} Total (${metrics.completed_trips} Completed, ${metrics.active_trips} Ongoing/Dispatched)`);
        doc.moveDown(1);

        // Section 3: Automated Fleet Insights
        if (insights && insights.length > 0) {
            doc.fillColor('#1A202C').fontSize(12).text('Automated Insights & Alerts', { bold: true });
            doc.moveDown(0.5);
            doc.fontSize(9).fillColor('#4A5568');
            insights.forEach(ins => {
                doc.text(`• ${ins}`);
                doc.moveDown(0.2);
            });
        }

        doc.end();
    } catch (err) {
        console.error('Error in exportPDF:', err);
        res.status(500).json({ message: 'Failed to export PDF report' });
    }
};
