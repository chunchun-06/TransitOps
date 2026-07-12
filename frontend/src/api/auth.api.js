import api from "./axios";

/**
 * POST /api/auth/login
 * @param {{ email: string, password: string }} credentials
 * @returns {{ success, message, data: { accessToken, user } }}
 */
export const login = async (credentials) => {
    const response = await api.post("/auth/login", credentials);
    return response.data;
};

/**
 * GET /api/auth/me  — fetch the currently authenticated user
 */
export const getCurrentUser = async () => {
    const response = await api.get("/auth/me");
    return response.data;
};

/**
 * POST /api/auth/logout
 */
export const logout = async () => {
    try {
        await api.post("/auth/logout");
    } catch {
        // Silently fail — we still clear state on the client
    }
};