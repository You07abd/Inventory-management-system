import client from "./client";

export const itemsApi = {
  list: (params = {}) => client.get("/items/", { params }).then((res) => res.data),
  get: (id) => client.get(`/items/${id}`).then((res) => res.data),
  getByAssetCode: (code) => client.get(`/items/by-asset-code/${encodeURIComponent(code)}`).then((res) => res.data),
  create: (payload) => client.post("/items/", payload).then((res) => res.data),
  update: (id, payload) => client.put(`/items/${id}`, payload).then((res) => res.data),
  remove: (id) => client.delete(`/items/${id}`).then((res) => res.data),
  checkout: (id, payload) => client.post(`/items/${id}/checkout`, payload).then((res) => res.data),
  checkin: (id, payload) => client.post(`/items/${id}/checkin`, payload).then((res) => res.data),
  cartCheckout: (payload) => client.post("/items/cart-checkout", payload).then((r) => r.data),
  adjust: (id, payload) => client.post(`/items/${id}/adjust`, payload).then((res) => res.data),
  stats: () => client.get("/items/stats").then((res) => res.data),
  importCsv: (file) => {
    const form = new FormData();
    form.append("file", file);
    return client
      .post("/items/import", form, { headers: { "Content-Type": "multipart/form-data" } })
      .then((res) => res.data);
  },
};
