import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/**
 * Wraps any route that requires authentication.
 * If the user is not authenticated, redirects to /login.
 */
const ProtectedRoute = ({ children }) => {

    const { isAuthenticated } = useAuth();

    if (!isAuthenticated()) {
        return <Navigate to="/login" replace />;
    }

    return children;

};

export default ProtectedRoute;