import api from "./axios";

export const getDrivers = () => api.get("/drivers");
export const getAvailableDrivers = () => api.get("/drivers/available");
export const getDriverById = (id) => api.get(`/drivers/${id}`);
export const createDriver = (driver) => api.post("/drivers", driver);
export const updateDriver = (id, driver) => api.put(`/drivers/${id}`, driver);
export const deleteDriver = (id) => api.delete(`/drivers/${id}`);
export const bulkDeleteDrivers = (ids) => api.post("/drivers/bulk-delete", { ids });
export const bulkUpdateDriverStatus = (ids, status) => api.patch("/drivers/bulk-status", { ids, status });

export const updateDriverStatus = (id, status) => api.patch(`/drivers/${id}/status`, { status });
export const uploadDriverPhoto = (id, formData) => api.post(`/drivers/${id}/photo`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
});
