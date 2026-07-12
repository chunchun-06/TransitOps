import { createContext, useContext, useState, useCallback, useEffect } from "react";
/* eslint-disable react-refresh/only-export-components */

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {

    const [user, setUser] = useState(() => {
        try {
            const stored = localStorage.getItem("user") || sessionStorage.getItem("user");
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    });

    const [token, setToken] = useState(() => {
        return localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken") || null;
    });

    /**
     * Persist token + user after a successful login.
     * @param {string} accessToken
     * @param {object} userData
     */
    const signin = useCallback((accessToken, userData, remember = true) => {
        
        const storage = remember ? localStorage : sessionStorage;
        storage.setItem("accessToken", accessToken);
        storage.setItem("user", JSON.stringify(userData));

        setToken(accessToken);
        setUser(userData);

    }, []);

    /**
     * Clear all session data and redirect to login.
     */
    const signout = useCallback(() => {

        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        sessionStorage.removeItem("accessToken");
        sessionStorage.removeItem("user");

        setToken(null);
        setUser(null);

    }, []);

    /**
     * Returns true if the user is currently authenticated.
     */
    const isAuthenticated = useCallback(() => {
        return !!user && !!token;
    }, [user, token]);

    /**
     * Returns the current logged-in user object.
     */
    const currentUser = useCallback(() => {
        return user;
    }, [user]);

    useEffect(() => {
        const handleUnauthorized = () => signout();
        window.addEventListener("auth:unauthorized", handleUnauthorized);
        return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
    }, [signout]);

    const value = {
        user,
        token,
        signin,
        signout,
        isAuthenticated,
        currentUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );

};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

export default AuthContext;