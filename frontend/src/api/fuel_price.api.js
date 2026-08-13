import api from "./axios";

export const getCurrentFuelPrice = (fuelType = "Diesel") => 
    api.get(`/fuel-price/current?fuel_type=${fuelType}`);

export const getFuelPriceHistory = () => 
    api.get("/fuel-price/history");

export const createFuelPrice = (data) => 
    api.post("/fuel-price", data);

export const updateFuelPrice = (id, data) => 
    api.put(`/fuel-price/${id}`, data);

export const deleteFuelPrice = (id) => 
    api.delete(`/fuel-price/${id}`);
