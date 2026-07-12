import api from "./axios";

export const getDashboardStats = () => api.get("/reports/dashboard-stats");
export const getChartsData = () => api.get("/reports/charts");
export const getInsights = () => api.get("/reports/insights");
