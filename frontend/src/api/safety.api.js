import api from "./axios";

export const getAllDriverSafety = () => api.get("/safety");
export const getDriverSafetyByDriver = (driverId) => api.get(`/safety/driver/${driverId}`);
export const upsertDriverSafety = (data) => api.post("/safety", data);
export const deleteDriverSafety = (id) => api.delete(`/safety/${id}`);
