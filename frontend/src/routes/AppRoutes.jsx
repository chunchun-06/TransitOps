import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login         from "../pages/auth/Login";
import ForgotPassword from "../pages/auth/ForgotPassword";
import Dashboard     from "../pages/dashboard/Dashboard";
import DashboardLayout from "../components/layout/DashboardLayout";
import ProtectedRoute  from "../components/auth/ProtectedRoute";
import RoleGuard       from "../components/auth/RoleGuard";
import Unauthorized    from "../pages/auth/Unauthorized";
import NotFound        from "../pages/NotFound";
import Vehicles    from "../pages/vehicle/VehiclePage";
import Drivers     from "../pages/driver/Drivers";
import Trips       from "../pages/trip/Trips";
import Maintenance from "../pages/maintenance/Maintenance";
import Fuel        from "../pages/fuel/Fuel";
import Expenses    from "../pages/expense/Expenses";
import Reports     from "../pages/reports/Reports";
import Users       from "../pages/users/Users";
import ChangePassword from "../pages/auth/ChangePassword";
import Profile     from "../pages/settings/Profile";
import Settings    from "../pages/settings/Settings";
// Financial Analyst – read-only module pages
import FinanceDrivers     from "../pages/finance/FinanceDrivers";
import FinanceTrips       from "../pages/finance/FinanceTrips";
import FinanceMaintenance from "../pages/finance/FinanceMaintenance";
import FinanceFuel        from "../pages/finance/FinanceFuel";
import FinanceExpenses    from "../pages/finance/FinanceExpenses";
// Safety Officer
import SafetyDrivers from "../pages/safety/SafetyDrivers";
import FinancialsPage from "../pages/finance/FinancialsPage";

import { FleetProvider } from "../context/FleetContext";

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
                            <FleetProvider>
                                <DashboardLayout />
                            </FleetProvider>
                        </ProtectedRoute>
                    }
                >
                    <Route path="/dashboard"   element={<Dashboard />} />
                    <Route path="/profile"     element={<Profile />} />
                    <Route path="/settings"    element={<Settings />} />
                    <Route path="/change-password" element={<ChangePassword />} />

                    {/* Feature routes with RoleGuard */}
                    <Route path="/vehicles" element={
                        <RoleGuard roles={["Fleet Manager", "Dispatcher", "Admin"]}>
                            <Vehicles />
                        </RoleGuard>
                    } />
                    
                    <Route path="/drivers" element={
                        <RoleGuard roles={["Fleet Manager", "Dispatcher", "Admin"]}>
                            <Drivers />
                        </RoleGuard>
                    } />

                    {/* Safety Officer – dedicated safety module */}
                    <Route path="/safety/drivers" element={
                        <RoleGuard roles={["Safety Officer"]}>
                            <SafetyDrivers />
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
                        <RoleGuard roles={["Fleet Manager"]}>
                            <Fuel />
                        </RoleGuard>
                    } />

                    <Route path="/expenses" element={
                        <RoleGuard roles={["Fleet Manager"]}>
                            <Expenses />
                        </RoleGuard>
                    } />

                    <Route path="/reports" element={
                        <RoleGuard roles={["Fleet Manager", "Financial Analyst"]}>
                            <Reports />
                        </RoleGuard>
                    } />

                    <Route path="/financials" element={
                        <RoleGuard roles={["Fleet Manager", "Financial Analyst"]}>
                            <FinancialsPage />
                        </RoleGuard>
                    } />

                    {/* Admin User Creation - Fleet Manager only */}
                    <Route path="/users" element={
                        <RoleGuard roles={["Fleet Manager"]}>
                            <Users />
                        </RoleGuard>
                    } />

                    {/* Financial Analyst – read-only views */}
                    <Route path="/finance/drivers" element={
                        <RoleGuard roles={["Financial Analyst"]}>
                            <FinanceDrivers />
                        </RoleGuard>
                    } />

                    <Route path="/finance/trips" element={
                        <RoleGuard roles={["Financial Analyst"]}>
                            <FinanceTrips />
                        </RoleGuard>
                    } />

                    <Route path="/finance/maintenance" element={
                        <RoleGuard roles={["Financial Analyst"]}>
                            <FinanceMaintenance />
                        </RoleGuard>
                    } />

                    <Route path="/finance/fuel" element={
                        <RoleGuard roles={["Financial Analyst"]}>
                            <FinanceFuel />
                        </RoleGuard>
                    } />

                    <Route path="/finance/expenses" element={
                        <RoleGuard roles={["Financial Analyst"]}>
                            <FinanceExpenses />
                        </RoleGuard>
                    } />

                </Route>

                {/* 404 fallback */}
                <Route path="*" element={<NotFound />} />



                <Route
                    path="*"
                    element={<Navigate to="/login" replace />}
                />

            </Routes>
        </BrowserRouter>
    );
};

export default AppRoutes;