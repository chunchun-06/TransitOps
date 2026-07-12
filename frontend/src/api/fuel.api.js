import api from "./axios";

export const getFuelLogs = () => api.get("/fuel");
export const createFuelLog = (logData) => api.post("/fuel", logData);
export const deleteFuelLog = (id) => api.delete(`/fuel/${id}`);
