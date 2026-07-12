import api from "./axios";

export const getFuelLogs = async () => {
    const response = await api.get("/fuel");
    return response.data;
};

export const createFuelLog = async (logData) => {
    const response = await api.post("/fuel", logData);
    return response.data;
};

export const deleteFuelLog = async (id) => {
    const response = await api.delete(`/fuel/${id}`);
    return response.data;
};
