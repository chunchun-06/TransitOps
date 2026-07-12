import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const VALID_ROLES = [
    "Fleet Manager",
    "Dispatcher",
    "Safety Officer",
    "Financial Analyst",
];

/**
 * Role-based guard. Accepts an array of allowed roles.
 *
 * Usage:
 *   <RoleGuard roles={["Fleet Manager", "Dispatcher"]}>
 *     <SomePage />
 *   </RoleGuard>
 */
const RoleGuard = ({ roles = VALID_ROLES, children }) => {

    const { isAuthenticated, currentUser } = useAuth();

    if (!isAuthenticated()) {
        return <Navigate to="/login" replace />;
    }

    const user = currentUser();

    if (!roles.includes(user?.role)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return children;

};

export default RoleGuard;