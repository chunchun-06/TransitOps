import api from "./axios";

export const getVehicles = () => api.get("/vehicles");
export const getVehicleById = (id) => api.get(`/vehicles/${id}`);
export const getAvailableVehicles = () => api.get("/vehicles/available");
export const createVehicle = (vehicle) => api.post("/vehicles", vehicle);
export const updateVehicle = (id, vehicle) => api.put(`/vehicles/${id}`, vehicle);
export const deleteVehicle = (id) => api.delete(`/vehicles/${id}`);
export const bulkDeleteVehicles = (ids) => api.post("/vehicles/bulk-delete", { ids });
export const bulkUpdateVehicleStatus = (ids, status) => api.patch("/vehicles/bulk-status", { ids, status });

export const updateVehicleStatus = (id, status) => api.patch(`/vehicles/${id}/status`, { status });
export const assignDriverToVehicle = (id, driver_id) => api.post(`/vehicles/${id}/assign-driver`, { driver_id });
export const uploadVehiclePhoto = (id, formData) => api.post(`/vehicles/${id}/photo`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
});
