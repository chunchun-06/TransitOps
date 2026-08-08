import api from "./axios";

export const getDashboardStats = (params = {}) => api.get("/reports/dashboard-stats", { params });
export const getChartsData = (params = {}) => api.get("/reports/charts", { params });
export const getInsights = (params = {}) => api.get("/reports/insights", { params });

