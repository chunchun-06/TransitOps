import api from "./axios";

export const getTrips = async () => {
    const response = await api.get("/trips");
    return response.data;
};

export const getTripById = async (id) => {
    const response = await api.get(`/trips/${id}`);
    return response.data;
};

export const createTrip = async (trip) => {
    const response = await api.post("/trips", trip);
    return response.data;
};

export const updateTripStatus = async (id, status) => {
    const response = await api.patch(`/trips/${id}/status`, { status });
    return response.data;
};

export const deleteTrip = async (id) => {
    const response = await api.delete(`/trips/${id}`);
    return response.data;
};
