import api from "./axios";

export const getUsers = () => api.get("/users");
export const createUser = (userData) => api.post("/users", userData);
export const updateUserRole = (id, role) => api.patch(`/users/${id}/role`, { role });
export const deleteUser = (id) => api.delete(`/users/${id}`);
