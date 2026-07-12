import api from "./axios";

export const getMaintenanceLogs = () => api.get("/maintenance");
export const createMaintenanceLog = (logData) => api.post("/maintenance", logData);
export const updateMaintenanceLog = (id, logData) => api.put(`/maintenance/${id}`, logData);
export const updateMaintenanceStatus = (id, status) => api.patch(`/maintenance/${id}/status`, { status });
export const deleteMaintenanceLog = (id) => api.delete(`/maintenance/${id}`);
