import api from "./axios";

export const getFinancialAnalytics = (params = {}) => {
    // params can include dateFrom, dateTo, period, vehicleId
    return api.get("/analytics/financial", { params });
};

export const getVehicleFinancials = (id, params = {}) => {
    return api.get(`/analytics/vehicle/${id}`, { params });
};
