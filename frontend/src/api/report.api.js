import api from "./axios";

export const getReports = async (filters) => {
    const response = await api.get("/reports", { params: filters });
    return response.data;
};
