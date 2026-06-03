import client from "./client";

export const checkoutApi = {
  unifiedCart: (payload) =>
    client.post("/checkout/unified-cart", payload).then((r) => r.data),
};
