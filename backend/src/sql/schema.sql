CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS fuel_logs CASCADE;
DROP TABLE IF EXISTS maintenance_logs CASCADE;
DROP TABLE IF EXISTS trips CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS drivers CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,

    role_id UUID NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_user_role
        FOREIGN KEY(role_id)
        REFERENCES roles(id)
        ON DELETE RESTRICT
);

CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id UUID UNIQUE,

    name VARCHAR(100) NOT NULL,

    license_number VARCHAR(100) UNIQUE NOT NULL,
    license_category VARCHAR(20),
    license_expiry DATE,

    contact_number VARCHAR(20),

    safety_score DECIMAL(5,2) DEFAULT 100,

    status VARCHAR(20)
        CHECK (
            status IN (
                'Available',
                'On Trip',
                'Off Duty',
                'Suspended'
            )
        )
        DEFAULT 'Available',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_driver_user
        FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE TABLE vehicles (

    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    registration_no VARCHAR(50) UNIQUE NOT NULL,

    vehicle_name VARCHAR(100) NOT NULL,

    vehicle_type VARCHAR(50),

    max_load_capacity DECIMAL(10,2),

    odometer DECIMAL(12,2) DEFAULT 0,

    acquisition_cost DECIMAL(12,2),

    status VARCHAR(20)
        CHECK (
            status IN (
                'Available',
                'On Trip',
                'In Shop',
                'Retired'
            )
        )
        DEFAULT 'Available',

    created_by UUID,
    updated_by UUID,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_vehicle_created_by
        FOREIGN KEY(created_by)
        REFERENCES users(id),

    CONSTRAINT fk_vehicle_updated_by
        FOREIGN KEY(updated_by)
        REFERENCES users(id)
);

CREATE TABLE trips (

    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    vehicle_id UUID NOT NULL,

    driver_id UUID NOT NULL,

    source VARCHAR(200),

    destination VARCHAR(200),

    cargo_weight DECIMAL(10,2),

    planned_distance DECIMAL(10,2),

    actual_distance DECIMAL(10,2),

    start_odometer DECIMAL(12,2),

    final_odometer DECIMAL(12,2),

    fuel_used DECIMAL(10,2),

    revenue DECIMAL(12,2),

    status VARCHAR(20)
        CHECK (
            status IN (
                'Draft',
                'Dispatched',
                'Completed',
                'Cancelled'
            )
        )
        DEFAULT 'Draft',

    created_by UUID,

    start_time TIMESTAMP,

    end_time TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_trip_vehicle
        FOREIGN KEY(vehicle_id)
        REFERENCES vehicles(id),

    CONSTRAINT fk_trip_driver
        FOREIGN KEY(driver_id)
        REFERENCES drivers(id),

    CONSTRAINT fk_trip_created_by
        FOREIGN KEY(created_by)
        REFERENCES users(id)
);

CREATE TABLE maintenance_logs (

    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    vehicle_id UUID NOT NULL,

    maintenance_type VARCHAR(100),

    description TEXT,

    cost DECIMAL(12,2),

    status VARCHAR(20)
        CHECK (
            status IN (
                'Active',
                'Completed'
            )
        )
        DEFAULT 'Active',

    start_date TIMESTAMP,

    end_date TIMESTAMP,

    created_by UUID,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_maintenance_vehicle
        FOREIGN KEY(vehicle_id)
        REFERENCES vehicles(id),

    CONSTRAINT fk_maintenance_user
        FOREIGN KEY(created_by)
        REFERENCES users(id)
);

CREATE TABLE fuel_logs (

    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    trip_id UUID,

    vehicle_id UUID,

    liters DECIMAL(10,2),

    cost DECIMAL(12,2),

    fuel_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    created_by UUID,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_fuel_trip
        FOREIGN KEY(trip_id)
        REFERENCES trips(id),

    CONSTRAINT fk_fuel_vehicle
        FOREIGN KEY(vehicle_id)
        REFERENCES vehicles(id),

    CONSTRAINT fk_fuel_user
        FOREIGN KEY(created_by)
        REFERENCES users(id)
);

CREATE TABLE expenses (

    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    vehicle_id UUID,

    expense_type VARCHAR(100),

    description TEXT,

    amount DECIMAL(12,2),

    expense_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    created_by UUID,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_expense_vehicle
        FOREIGN KEY(vehicle_id)
        REFERENCES vehicles(id),

    CONSTRAINT fk_expense_user
        FOREIGN KEY(created_by)
        REFERENCES users(id)
);

CREATE INDEX idx_users_email
ON users(email);

CREATE INDEX idx_vehicle_registration
ON vehicles(registration_no);

CREATE INDEX idx_driver_license
ON drivers(license_number);

CREATE INDEX idx_trip_vehicle
ON trips(vehicle_id);

CREATE INDEX idx_trip_driver
ON trips(driver_id);