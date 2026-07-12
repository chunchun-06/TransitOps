import api from "./axios";

export const getExpenses = async () => {
    const response = await api.get("/expenses");
    return response.data;
};

export const createExpense = async (expenseData) => {
    const response = await api.post("/expenses", expenseData);
    return response.data;
};

export const deleteExpense = async (id) => {
    const response = await api.delete(`/expenses/${id}`);
    return response.data;
};
