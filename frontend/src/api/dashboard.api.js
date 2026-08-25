import api from "./axios";

export const getDashboardData = (params = {}) => api.get("/dashboard", { params });
