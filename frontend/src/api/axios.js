import axios from "axios";

// Safely sanitize VITE_API_URL to ensure /api suffix is handled cleanly
const rawUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
const cleanUrl = rawUrl.replace(/\/+$/, "").replace(/\/api$/, "");

const api = axios.create({
    baseURL: `${cleanUrl}/api`,
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 120000,
});

// Request interceptor
api.interceptors.request.use(
    (config) => {
        const token =
            localStorage.getItem("accessToken") ||
            sessionStorage.getItem("accessToken");

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Let browser set Content-Type with boundary for multipart/form-data
        if (config.data instanceof FormData) {
            delete config.headers["Content-Type"];
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor
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