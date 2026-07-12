import api from "./axios";

export const getUsers = async () => {
    const response = await api.get("/users");
    return response.data;
};

export const createUser = async (userData) => {
    const response = await api.post("/users", userData);
    return response.data;
};

export const updateUserRole = async (id, role) => {
    const response = await api.patch(`/users/${id}/role`, { role });
    return response.data;
};

export const deleteUser = async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
};
