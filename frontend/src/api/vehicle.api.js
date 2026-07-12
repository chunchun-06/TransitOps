import api from "./axios";

// Get all vehicles
export const getVehicles = async () => {
    const response = await api.get("/vehicles");
    return response.data;
};

// Get one vehicle
export const getVehicleById = async (id) => {
    const response = await api.get(`/vehicles/${id}`);
    return response.data;
};

// Get available vehicles
export const getAvailableVehicles = async () => {
    const response = await api.get("/vehicles/available");
    return response.data;
};

// Create vehicle
export const createVehicle = async (vehicle) => {
    const response = await api.post("/vehicles", vehicle);
    return response.data;
};

// Update vehicle
export const updateVehicle = async (id, vehicle) => {
    const response = await api.put(`/vehicles/${id}`, vehicle);
    return response.data;
};

// Delete vehicle
export const deleteVehicle = async (id) => {
    const response = await api.delete(`/vehicles/${id}`);
    return response.data;
};