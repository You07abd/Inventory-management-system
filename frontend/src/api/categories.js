import client from "./client";

export const categoriesApi = {
  list: () => client.get("/categories/").then((res) => res.data),
  get: (id) => client.get(`/categories/${id}`).then((res) => res.data),
  create: (payload) => client.post("/categories/", payload).then((res) => res.data),
  update: (id, payload) => client.put(`/categories/${id}`, payload).then((res) => res.data),
  remove: (id) => client.delete(`/categories/${id}`).then((res) => res.data)
};
