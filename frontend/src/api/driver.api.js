import api from "./axios";

export const getDrivers = () => api.get("/drivers");
export const getDriverById = (id) => api.get(`/drivers/${id}`);
export const createDriver = (driver) => api.post("/drivers", driver);
export const updateDriver = (id, driver) => api.put(`/drivers/${id}`, driver);
export const deleteDriver = (id) => api.delete(`/drivers/${id}`);
export const bulkDeleteDrivers = (ids) => api.post("/drivers/bulk-delete", { ids });
export const bulkUpdateDriverStatus = (ids, status) => api.patch("/drivers/bulk-status", { ids, status });
