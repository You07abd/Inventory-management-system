import client from './client';

export const unitsApi = {
  listByItem: (itemId) => client.get(`/items/${itemId}/units`).then(r => r.data),
  get: (id) => client.get(`/units/${id}`).then(r => r.data),
  getByAssetCode: (code) => client.get(`/units/by-asset-code/${encodeURIComponent(code)}`).then(r => r.data),
  create: (itemId, payload) => client.post(`/items/${itemId}/units`, payload).then(r => r.data),
  update: (id, payload) => client.put(`/units/${id}`, payload).then(r => r.data),
  remove: (id) => client.delete(`/units/${id}`).then(r => r.data),
  checkout: (id, payload) => client.post(`/units/${id}/checkout`, payload).then(r => r.data),
  checkin: (id, payload) => client.post(`/units/${id}/checkin`, payload).then(r => r.data),
  cartCheckout: (payload) => client.post(`/units/cart-checkout`, payload).then(r => r.data),
};
