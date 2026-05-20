import client from "./client";

export const transactionsApi = {
  list: (params = {}) => client.get("/transactions/", { params }).then((res) => res.data),
  get: (id) => client.get(`/transactions/${id}`).then((res) => res.data)
};
