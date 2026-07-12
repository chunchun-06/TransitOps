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
