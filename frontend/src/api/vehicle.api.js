import api from "./axios";

export const getVehicles = () => api.get("/vehicles");
export const getVehicleById = (id) => api.get(`/vehicles/${id}`);
export const getAvailableVehicles = () => api.get("/vehicles/available");
export const createVehicle = (vehicle) => api.post("/vehicles", vehicle);
export const updateVehicle = (id, vehicle) => api.put(`/vehicles/${id}`, vehicle);
export const deleteVehicle = (id) => api.delete(`/vehicles/${id}`);
export const bulkDeleteVehicles = (ids) => api.post("/vehicles/bulk-delete", { ids });
export const bulkUpdateVehicleStatus = (ids, status) => api.patch("/vehicles/bulk-status", { ids, status });
