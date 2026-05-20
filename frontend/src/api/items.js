import client from "./client";

export const itemsApi = {
  list: (params = {}) => client.get("/items/", { params }).then((res) => res.data),
  get: (id) => client.get(`/items/${id}`).then((res) => res.data),
  getByAssetCode: (code) => client.get(`/items/by-asset-code/${encodeURIComponent(code)}`).then((res) => res.data),
  create: (payload) => client.post("/items/", payload).then((res) => res.data),
  update: (id, payload) => client.put(`/items/${id}`, payload).then((res) => res.data),
  remove: (id) => client.delete(`/items/${id}`).then((res) => res.data),
  checkout: (id, payload) => client.post(`/items/${id}/checkout`, payload).then((res) => res.data),
  checkin: (id, payload) => client.post(`/items/${id}/checkin`, payload).then((res) => res.data)
};
