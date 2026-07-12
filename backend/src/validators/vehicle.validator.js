const validateVehicle = (vehicle) => {
    const {
        registration_no,
        vehicle_name,
        vehicle_type,
        max_load_capacity,
        odometer,
        acquisition_cost,
        status
    } = vehicle;

    if (!registration_no || registration_no.trim() === "") {
        throw new Error("Registration number is required.");
    }

    if (!vehicle_name || vehicle_name.trim() === "") {
        throw new Error("Vehicle name is required.");
    }

    if (!vehicle_type || vehicle_type.trim() === "") {
        throw new Error("Vehicle type is required.");
    }

    if (max_load_capacity == null || max_load_capacity <= 0) {
        throw new Error("Maximum load capacity must be greater than 0.");
    }

    if (odometer == null || odometer < 0) {
        throw new Error("Odometer cannot be negative.");
    }

    if (acquisition_cost == null || acquisition_cost < 0) {
        throw new Error("Acquisition cost cannot be negative.");
    }

    const validStatus = [
        "Available",
        "On Trip",
        "In Shop",
        "Retired"
    ];

    if (status && !validStatus.includes(status)) {
        throw new Error("Invalid vehicle status.");
    }
};

module.exports = {
    validateVehicle
};