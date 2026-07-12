import api from "./axios";

export const getDrivers = async () => {
    const response = await api.get("/drivers");
    return response.data;
};

export const getDriverById = async (id) => {
    const response = await api.get(`/drivers/${id}`);
    return response.data;
};

export const createDriver = async (driver) => {
    const response = await api.post("/drivers", driver);
    return response.data;
};

export const updateDriver = async (id, driver) => {
    const response = await api.put(`/drivers/${id}`, driver);
    return response.data;
};

export const deleteDriver = async (id) => {
    const response = await api.delete(`/drivers/${id}`);
    return response.data;
};

export const updateDriverStatus = async (id, status) => {
    const response = await api.patch(`/drivers/${id}/status`, { status });
    return response.data;
};

export const bulkDeleteDrivers = async (ids) => {
    const response = await api.post("/drivers/bulk-delete", { ids });
    return response.data;
};

export const bulkUpdateDriverStatus = async (ids, status) => {
    const response = await api.patch("/drivers/bulk-status", { ids, status });
    return response.data;
};
