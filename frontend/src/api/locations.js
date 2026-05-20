import client from "./client";

export const locationsApi = {
  list: () => client.get("/locations/").then((res) => res.data),
  get: (id) => client.get(`/locations/${id}`).then((res) => res.data),
  create: (payload) => client.post("/locations/", payload).then((res) => res.data),
  update: (id, payload) => client.put(`/locations/${id}`, payload).then((res) => res.data),
  remove: (id) => client.delete(`/locations/${id}`).then((res) => res.data)
};
