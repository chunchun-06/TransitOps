const fuelService = require("../services/fuel.service");

/*
    GET ALL FUEL LOGS
*/
const getAllFuelLogs = async (req, res) => {

    try {

        const fuelLogs = await fuelService.getAllFuelLogs();

        res.status(200).json({
            success: true,
            message: "Fuel logs fetched successfully",
            data: fuelLogs
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

/*
    GET FUEL LOG BY ID
*/
const getFuelLogById = async (req, res) => {

    try {

        const { id } = req.params;

        const fuelLog = await fuelService.getFuelLogById(id);

        if (!fuelLog) {

            return res.status(404).json({
                success: false,
                message: "Fuel log not found"
            });

        }

        res.status(200).json({
            success: true,
            message: "Fuel log fetched successfully",
            data: fuelLog
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

/*
    CREATE FUEL LOG
*/
const createFuelLog = async (req, res) => {

    try {

        const fuelLog = await fuelService.createFuelLog(req.body);

        res.status(201).json({
            success: true,
            message: "Fuel log created successfully",
            data: fuelLog
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

/*
    UPDATE FUEL LOG
*/
const updateFuelLog = async (req, res) => {

    try {

        const { id } = req.params;

        const fuelLog = await fuelService.updateFuelLog(id, req.body);

        if (!fuelLog) {

            return res.status(404).json({
                success: false,
                message: "Fuel log not found"
            });

        }

        res.status(200).json({
            success: true,
            message: "Fuel log updated successfully",
            data: fuelLog
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

/*
    DELETE FUEL LOG
*/
const deleteFuelLog = async (req, res) => {

    try {

        const { id } = req.params;

        const fuelLog = await fuelService.deleteFuelLog(id);

        if (!fuelLog) {

            return res.status(404).json({
                success: false,
                message: "Fuel log not found"
            });

        }

        res.status(200).json({
            success: true,
            message: "Fuel log deleted successfully",
            data: fuelLog
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

module.exports = {

    getAllFuelLogs,

    getFuelLogById,

    createFuelLog,

    updateFuelLog,

    deleteFuelLog

};