import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login         from "../pages/auth/Login";
import ForgotPassword from "../pages/auth/ForgotPassword";
import Dashboard     from "../pages/dashboard/Dashboard";
import DashboardLayout from "../components/layout/DashboardLayout";
import ProtectedRoute  from "../components/auth/ProtectedRoute";
import RoleGuard       from "../components/auth/RoleGuard";
import Unauthorized    from "../pages/auth/Unauthorized";
import NotFound        from "../pages/NotFound";

// Feature pages
import Vehicles    from "../pages/vehicle/Vehicles";
import Drivers     from "../pages/driver/Drivers";
import Trips       from "../pages/trip/Trips";
import Maintenance from "../pages/maintenance/Maintenance";
import Fuel        from "../pages/fuel/Fuel";
import Expenses    from "../pages/expense/Expenses";
import Reports     from "../pages/reports/Reports";
import Users       from "../pages/users/Users";
import ChangePassword from "../pages/auth/ChangePassword";
import Profile     from "../pages/settings/Profile";

const AppRoutes = () => {
    return (
        <BrowserRouter>
            <Routes>

                {/* Public / Unauthenticated routes */}
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/unauthorized" element={<Unauthorized />} />

                {/* Protected shell */} 
                <Route
                    element={
                        <ProtectedRoute>
                            <DashboardLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route path="/dashboard"   element={<Dashboard />} />
                    <Route path="/profile"     element={<Profile />} />
                    <Route path="/change-password" element={<ChangePassword />} />

                    {/* Feature routes with RoleGuard */}
                    <Route path="/vehicles" element={
                        <RoleGuard roles={["Fleet Manager"]}>
                            <Vehicles />
                        </RoleGuard>
                    } />
                    
                    <Route path="/drivers" element={
                        <RoleGuard roles={["Fleet Manager", "Safety Officer"]}>
                            <Drivers />
                        </RoleGuard>
                    } />

                    <Route path="/trips" element={
                        <RoleGuard roles={["Fleet Manager", "Dispatcher"]}>
                            <Trips />
                        </RoleGuard>
                    } />

                    <Route path="/maintenance" element={
                        <RoleGuard roles={["Fleet Manager"]}>
                            <Maintenance />
                        </RoleGuard>
                    } />

                    <Route path="/fuel" element={
                        <RoleGuard roles={["Financial Analyst"]}>
                            <Fuel />
                        </RoleGuard>
                    } />

                    <Route path="/expenses" element={
                        <RoleGuard roles={["Financial Analyst"]}>
                            <Expenses />
                        </RoleGuard>
                    } />

                    <Route path="/reports" element={
                        <RoleGuard roles={["Financial Analyst"]}>
                            <Reports />
                        </RoleGuard>
                    } />

                    {/* Admin User Creation - Fleet Manager only */}
                    <Route path="/users" element={
                        <RoleGuard roles={["Fleet Manager"]}>
                            <Users />
                        </RoleGuard>
                    } />

                </Route>

                {/* 404 fallback */}
                <Route path="*" element={<NotFound />} />

                <Route
                    path="/vehicles"
                    element={
                        <ProtectedRoute>
                            <VehiclePage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="*"
                    element={<Navigate to="/login" replace />}
                />

            </Routes>
        </BrowserRouter>
    );
};

export default AppRoutes;