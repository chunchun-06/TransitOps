import api from "./axios";

export const getExpenses = () => api.get("/expenses");
export const createExpense = (expenseData) => api.post("/expenses", expenseData);
export const deleteExpense = (id) => api.delete(`/expenses/${id}`);
