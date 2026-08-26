import api from "./axios";

export const getFuelLogs = () => api.get("/fuel");
export const createFuelLog = (logData) => api.post("/fuel", logData);
export const deleteFuelLog = (id) => api.delete(`/fuel/${id}`);
export const extractFuelReceipt = (formData) => api.post("/fuel/extract", formData, {
    headers: {
        "Content-Type": "multipart/form-data"
    }
});
export const getFuelAnalytics = (params) => api.get("/fuel/analytics", { params });
