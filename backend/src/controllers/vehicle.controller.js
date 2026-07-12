// src/controllers/vehicle.controller.js

const vehicleService = require("../services/vehicle.service");

// Get all vehicles
const getAllVehicles = async (req, res) => {
    try {
        const vehicles = await vehicleService.getAllVehicles();

        res.status(200).json({
            success: true,
            data: vehicles
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get vehicle by ID
const getVehicleById = async (req, res) => {
    try {
        const { id } = req.params;

        const vehicle = await vehicleService.getVehicleById(id);

        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: "Vehicle not found"
            });
        }

        res.status(200).json({
            success: true,
            data: vehicle
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Create vehicle
const createVehicle = async (req, res) => {
    try {
        const vehicle = await vehicleService.createVehicle(req.body);

        res.status(201).json({
            success: true,
            message: "Vehicle created successfully",
            data: vehicle
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Update vehicle
const updateVehicle = async (req, res) => {
    try {
        const { id } = req.params;

        const vehicle = await vehicleService.updateVehicle(id, req.body);

        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: "Vehicle not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Vehicle updated successfully",
            data: vehicle
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Delete vehicle
const deleteVehicle = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await vehicleService.deleteVehicle(id);

        res.status(200).json({
            success: true,
            message: result.message
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get available vehicles
const getAvailableVehicles = async (req, res) => {
    try {
        const vehicles = await vehicleService.getAvailableVehicles();

        res.status(200).json({
            success: true,
            data: vehicles
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    getAllVehicles,
    getVehicleById,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    getAvailableVehicles
};