import api from "./axios";

export const getMaintenanceLogs = async () => {
    const response = await api.get("/maintenance");
    return response.data;
};

export const createMaintenanceLog = async (logData) => {
    const response = await api.post("/maintenance", logData);
    return response.data;
};

export const updateMaintenanceLog = async (id, logData) => {
    const response = await api.put(`/maintenance/${id}`, logData);
    return response.data;
};

export const updateMaintenanceStatus = async (id, status) => {
    const response = await api.patch(`/maintenance/${id}/status`, { status });
    return response.data;
};

export const deleteMaintenanceLog = async (id) => {
    const response = await api.delete(`/maintenance/${id}`);
    return response.data;
};
