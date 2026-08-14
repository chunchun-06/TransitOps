import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getTrips } from "../api/trip.api";
import { getVehicles } from "../api/vehicle.api";
import { getDrivers } from "../api/driver.api";
import { getFuelLogs, createFuelLog, deleteFuelLog } from "../api/fuel.api";

const FleetContext = createContext(null);

export const FleetProvider = ({ children }) => {
    const [trips, setTrips] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [fuelRecords, setFuelRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchFleetData = useCallback(async () => {
        try {
            setLoading(true);
            const [tripsRes, vehiclesRes, driversRes, fuelRes] = await Promise.all([
                getTrips().catch(() => ({ data: [] })),
                getVehicles().catch(() => ({ data: [] })),
                getDrivers().catch(() => ({ data: [] })),
                getFuelLogs().catch(() => ({ data: [] }))
            ]);

            setTrips(tripsRes.data || []);
            setVehicles(vehiclesRes.data || []);
            setDrivers(driversRes.data || []);

            // Initial backend fuel logs combined with default mock entries if empty
            const backendLogs = fuelRes.data || [];
            if (backendLogs.length === 0) {
                // Initial sample records for UI presentation
                const sampleRecords = [
                    {
                        id: "fb-sample-1",
                        bill_number: "FB-10234",
                        date: "2026-08-12",
                        vehicle_id: vehiclesRes.data?.[0]?.id || "",
                        vehicle_reg: vehiclesRes.data?.[0]?.registration_no || "TN-38-AB-1234",
                        driver_id: driversRes.data?.[0]?.id || "",
                        driver_name: driversRes.data?.[0]?.name || "Alex",
                        trip_id: tripsRes.data?.[0]?.id || "",
                        trip_code: tripsRes.data?.[0] ? `TR-${String(tripsRes.data[0].id).substring(0, 5).toUpperCase()}` : "TR-102",
                        fuel_type: "Diesel",
                        volume: 45.6,
                        amount: 4560,
                        price_per_litre: 100,
                        bill_file_name: "fuel_bill_001.jpg"
                    },
                    {
                        id: "fb-sample-2",
                        bill_number: "FB-10233",
                        date: "2026-08-11",
                        vehicle_id: vehiclesRes.data?.[1]?.id || "",
                        vehicle_reg: vehiclesRes.data?.[1]?.registration_no || "TN-38-CD-5678",
                        driver_id: driversRes.data?.[1]?.id || "",
                        driver_name: driversRes.data?.[1]?.name || "Ravi",
                        trip_id: "",
                        trip_code: "—",
                        fuel_type: "Diesel",
                        volume: 38.2,
                        amount: 3858,
                        price_per_litre: 101,
                        bill_file_name: "fuel_bill_002.pdf"
                    }
                ];
                setFuelRecords(sampleRecords);
            } else {
                setFuelRecords(backendLogs.map(log => {
                    const matchedVehicle = vehiclesRes.data?.find(v => v.id === log.vehicle_id);
                    const matchedTrip = tripsRes.data?.find(t => t.id === log.trip_id);
                    const matchedDriver = matchedTrip 
                        ? driversRes.data?.find(d => d.id === matchedTrip.driver_id) 
                        : (log.driver_id ? driversRes.data?.find(d => d.id === log.driver_id) : null);
                    
                    const vehicleDisplay = matchedVehicle 
                        ? `${matchedVehicle.registration_no} (${matchedVehicle.vehicle_name})`
                        : (log.registration_no || "—");

                    return {
                        id: log.id,
                        bill_number: log.bill_number || `FB-${String(log.id).substring(0, 8).toUpperCase()}`,
                        date: log.date ? log.date.split("T")[0] : new Date().toISOString().split("T")[0],
                        vehicle_id: log.vehicle_id,
                        vehicle_reg: vehicleDisplay,
                        driver_id: matchedDriver ? matchedDriver.id : "",
                        driver_name: matchedDriver ? matchedDriver.name : "—",
                        trip_id: log.trip_id || "",
                        trip_code: log.trip_id ? `TR-${String(log.trip_id).substring(0, 5).toUpperCase()}` : "—",
                        fuel_type: log.fuel_type || "Diesel",
                        volume: parseFloat(log.fuel_amount || log.volume || 0),
                        amount: parseFloat(log.cost || log.amount || 0),
                        price_per_litre: log.price_per_liter ? parseFloat(log.price_per_liter) : (log.fuel_amount ? Math.round((log.cost / log.fuel_amount) * 100) / 100 : 100),
                        bill_file_name: log.bill_file_name || "receipt.pdf"
                    };
                }));
            }
        } catch (err) {
            console.error("Error loading fleet context data:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFleetData();
    }, [fetchFleetData]);

    // Action to add newly created trip from real backend POST /trips response
    const addTripToState = (createdTrip) => {
        setTrips(prev => [createdTrip, ...prev]);
        
        // Update vehicle and driver status in state to "On Trip"
        if (createdTrip.vehicle_id) {
            setVehicles(prev => prev.map(v => v.id === createdTrip.vehicle_id ? { ...v, status: "On Trip" } : v));
        }
        if (createdTrip.driver_id) {
            setDrivers(prev => prev.map(d => d.id === createdTrip.driver_id ? { ...d, status: "On Trip" } : d));
        }
    };

    // Action to update trip status (Completed / Cancelled)
    const updateTripInState = (updatedTrip) => {
        setTrips(prev => prev.map(t => t.id === updatedTrip.id ? { ...t, ...updatedTrip } : t));

        if (updatedTrip.status === "Completed" || updatedTrip.status === "Cancelled") {
            if (updatedTrip.vehicle_id) {
                setVehicles(prev => prev.map(v => v.id === updatedTrip.vehicle_id ? { ...v, status: "Available" } : v));
            }
            if (updatedTrip.driver_id) {
                setDrivers(prev => prev.map(d => d.id === updatedTrip.driver_id ? { ...d, status: "Available" } : d));
            }
        }
    };

    // Action to add user-confirmed fuel bill record (frontend UI state & persistent database)
    const addFuelBillRecord = async (record) => {
        try {
            const payload = {
                vehicle_id: record.vehicle_id || null,
                trip_id: record.trip_id || null,
                fuel_amount: parseFloat(record.volume) || 0,
                cost: parseFloat(record.amount) || 0,
                price_per_liter: parseFloat(record.price_per_litre) || null,
                fuel_type: record.fuel_type || "Diesel",
                date: record.date || new Date().toISOString()
            };
            const response = await createFuelLog(payload);
            const created = response.data;

            // Map backend response to match frontend UI format
            const newRecord = {
                id: created.id,
                bill_number: record.bill_number || `FB-${String(created.id).substring(0, 8).toUpperCase()}`,
                date: created.date ? created.date.split("T")[0] : (record.date || new Date().toISOString().split("T")[0]),
                vehicle_id: created.vehicle_id,
                vehicle_reg: record.vehicle_reg,
                driver_id: record.driver_id,
                driver_name: record.driver_name,
                trip_id: created.trip_id,
                trip_code: record.trip_code,
                fuel_type: created.fuel_type || "Diesel",
                volume: parseFloat(created.fuel_amount || 0),
                amount: parseFloat(created.cost || 0),
                price_per_litre: created.price_per_liter ? parseFloat(created.price_per_liter) : (parseFloat(record.price_per_litre) || 100),
                bill_file_name: record.bill_file_name || "receipt.pdf"
            };

            setFuelRecords(prev => [newRecord, ...prev]);
            
            // Re-fetch all data to synchronize vehicles (current fuel level) and trips
            fetchFleetData();
        } catch (err) {
            console.error("Error creating fuel log on backend:", err);
            // Fallback to local state if backend call fails
            setFuelRecords(prev => [record, ...prev]);
        }
    };

    // Action to delete fuel record (frontend UI state & persistent database)
    const deleteFuelBillRecord = async (id) => {
        try {
            if (id && !id.startsWith("fb-sample-")) {
                await deleteFuelLog(id);
            }
            setFuelRecords(prev => prev.filter(r => r.id !== id));
            // Re-fetch fleet data to sync vehicle and dashboard state
            fetchFleetData();
        } catch (err) {
            console.error("Error deleting fuel log on backend:", err);
            // Fallback: delete locally anyway
            setFuelRecords(prev => prev.filter(r => r.id !== id));
        }
    };

    return (
        <FleetContext.Provider
            value={{
                trips,
                vehicles,
                drivers,
                fuelRecords,
                loading,
                fetchFleetData,
                addTripToState,
                updateTripInState,
                addFuelBillRecord,
                deleteFuelBillRecord
            }}
        >
            {children}
        </FleetContext.Provider>
    );
};

export const useFleet = () => {
    const context = useContext(FleetContext);
    if (!context) {
        throw new Error("useFleet must be used within a FleetProvider");
    }
    return context;
};
