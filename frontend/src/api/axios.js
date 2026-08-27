import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 120000, // 2 min — needed for Tesseract OCR scans
});

// ── Request interceptor ─────────────────────────────────────────────────────
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        // Let the browser set Content-Type (with boundary) for multipart uploads
        if (config.data instanceof FormData) {
            delete config.headers["Content-Type"];
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
        const backendMsg = error.response?.data?.message || error.response?.data?.error;
        if (backendMsg && typeof backendMsg === 'string') {
            error.message = backendMsg;
        }
        return Promise.reject(error);
    }
);

export default api;