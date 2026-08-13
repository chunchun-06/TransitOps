import api from "./axios";

export const getTrips = () => api.get("/trips");
export const getActiveTrips = () => api.get("/trips/active");
export const createTrip = (data) => api.post("/trips", data);
export const updateTrip = (id, data) => api.put(`/trips/${id}`, data);
export const deleteTrip = (id) => api.delete(`/trips/${id}`);
