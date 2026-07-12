import api from "./axios";

export const getVehicles = async () => {
    const response = await api.get("/vehicles");
    return response.data;
};

export const getVehicleById = async (id) => {
    const response = await api.get(`/vehicles/${id}`);
    return response.data;
};

export const getAvailableVehicles = async () => {
    const response = await api.get("/vehicles/available");
    return response.data;
};

export const createVehicle = async (vehicle) => {
    const response = await api.post("/vehicles", vehicle);
    return response.data;
};

export const updateVehicle = async (id, vehicle) => {
    const response = await api.put(`/vehicles/${id}`, vehicle);
    return response.data;
};

export const deleteVehicle = async (id) => {
    const response = await api.delete(`/vehicles/${id}`);
    return response.data;
};

export const bulkDeleteVehicles = async (ids) => {
    const response = await api.post("/vehicles/bulk-delete", { ids });
    return response.data;
};

export const bulkUpdateVehicleStatus = async (ids, status) => {
    const response = await api.patch("/vehicles/bulk-status", { ids, status });
    return response.data;
};
