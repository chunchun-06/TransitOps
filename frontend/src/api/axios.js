import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 15000,
});

// ── Request interceptor ─────────────────────────────────────────────────────
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ── Response interceptor ────────────────────────────────────────────────────
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("user");
            sessionStorage.removeItem("accessToken");
            sessionStorage.removeItem("user");
            window.dispatchEvent(new Event("auth:unauthorized"));
        }
        return Promise.reject(error);
    }
);

export default api;