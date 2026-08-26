/**
 * Utility for Fuel Variance & Performance Calculations
 */

/**
 * Computes Variance Status based on Estimated Fuel (L) and Actual Fuel (L)
 * Threshold Config:
 * - <= 0%: LOW CONSUMPTION (Efficient)
 * - 0% - 5%: WITHIN EXPECTED RANGE
 * - 5% - 10%: SLIGHTLY HIGH
 * - > 10%: HIGH CONSUMPTION
 * - Missing/Zero: Awaiting actual fuel data / Pending
 */
export const getFuelVarianceStatus = (estimatedFuel, actualFuel) => {
    const est = parseFloat(estimatedFuel);
    const act = parseFloat(actualFuel);

    if (isNaN(est) || est <= 0 || isNaN(act) || act <= 0) {
        return {
            status: "PENDING",
            label: "Awaiting actual fuel data",
            badgeClass: "bg-slate-500/10 text-muted border-slate-500/20",
            varianceLiters: 0,
            variancePct: 0
        };
    }

    const varianceLiters = Math.round((act - est) * 100) / 100;
    const variancePct = Math.round(((act - est) / est) * 10000) / 100;

    if (variancePct <= 0) {
        return {
            status: "LOW_CONSUMPTION",
            label: "LOW CONSUMPTION",
            badgeClass: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
            varianceLiters,
            variancePct
        };
    } else if (variancePct <= 5) {
        return {
            status: "WITHIN_RANGE",
            label: "WITHIN EXPECTED RANGE",
            badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/20",
            varianceLiters,
            variancePct
        };
    } else if (variancePct <= 10) {
        return {
            status: "SLIGHTLY_HIGH",
            label: "SLIGHTLY HIGH",
            badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
            varianceLiters,
            variancePct
        };
    } else {
        return {
            status: "HIGH_CONSUMPTION",
            label: "HIGH CONSUMPTION",
            badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/20",
            varianceLiters,
            variancePct
        };
    }
};

/**
 * Calculates Estimated Efficiency (KM/L)
 */
export const calcEstimatedKmpl = (plannedDistance, estimatedFuel) => {
    const dist = parseFloat(plannedDistance);
    const fuel = parseFloat(estimatedFuel);
    if (!dist || dist <= 0 || !fuel || fuel <= 0) return "—";
    return (dist / fuel).toFixed(2);
};

/**
 * Calculates Actual Efficiency (KM/L)
 */
export const calcActualKmpl = (actualDistance, plannedDistance, actualFuel) => {
    const dist = parseFloat(actualDistance) || parseFloat(plannedDistance);
    const fuel = parseFloat(actualFuel);
    if (!dist || dist <= 0 || !fuel || fuel <= 0) return "—";
    return (dist / fuel).toFixed(2);
};

/**
 * Calculates Fuel Cost Per KM (₹/KM)
 */
export const calcFuelCostPerKm = (actualCost, estimatedCost, actualDistance, plannedDistance) => {
    const cost = parseFloat(actualCost) || parseFloat(estimatedCost);
    const dist = parseFloat(actualDistance) || parseFloat(plannedDistance);
    if (!cost || cost <= 0 || !dist || dist <= 0) return "—";
    return (cost / dist).toFixed(2);
};
