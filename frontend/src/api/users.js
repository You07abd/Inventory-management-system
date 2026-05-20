import client from "./client";

export const usersApi = {
  list: () => client.get("/users/").then((res) => res.data),
  get: (id) => client.get(`/users/${id}`).then((res) => res.data),
  create: (payload) => client.post("/users/", payload).then((res) => res.data),
  update: (id, payload) => client.put(`/users/${id}`, payload).then((res) => res.data),
  remove: (id) => client.delete(`/users/${id}`).then((res) => res.data)
};
