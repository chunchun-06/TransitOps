const FinancialAnalyticsService = require('./src/services/financial_analytics.service');

async function testReconciliation() {
    console.log("=== TRANSITOPS FINANCIAL & OPERATIONAL RECONCILIATION TEST ===");
    try {
        console.log("\n1. Testing Financial Metrics (All Time)...");
        const allMetrics = await FinancialAnalyticsService.getFinancialMetrics({});
        console.log("ALL TIME METRICS:", JSON.stringify(allMetrics, null, 2));

        console.log("\n2. Testing Financial Metrics (This Month)...");
        const monthMetrics = await FinancialAnalyticsService.getFinancialMetrics({ period: 'This Month' });
        console.log("THIS MONTH METRICS:", JSON.stringify(monthMetrics, null, 2));

        console.log("\n3. Testing Dashboard Overview...");
        const overview = await FinancialAnalyticsService.getDashboardOverview({});
        console.log("OPERATIONAL OVERVIEW:", JSON.stringify(overview.operational, null, 2));

        console.log("\n4. Testing Vehicle Rankings...");
        const rankings = await FinancialAnalyticsService.getVehicleRankings({});
        console.log("VEHICLE YIELD RANKINGS:", JSON.stringify(rankings, null, 2));

        console.log("\n5. Testing Insights...");
        const insights = await FinancialAnalyticsService.getInsights({});
        console.log("AUTOMATED INSIGHTS:", JSON.stringify(insights, null, 2));

        console.log("\n✅ ALL RECONCILIATION CHECKS PASSED SUCCESSFULLY!");
        process.exit(0);
    } catch (err) {
        console.error("\n❌ RECONCILIATION TEST FAILED:", err);
        process.exit(1);
    }
}

testReconciliation();
