import api from "./axios";

export const getTollRates = (params) => api.get("/toll-rates", { params });
export const getTollEstimate = (params) => api.get("/toll-rates/estimate", { params });
export const createTollRate = (data) => api.post("/toll-rates", data);
export const updateTollRate = (id, data) => api.put(`/toll-rates/${id}`, data);
export const deleteTollRate = (id) => api.delete(`/toll-rates/${id}`);
