import client from "./client";

export const barcodeApi = {
  lookup: (code) =>
    client
      .get("/barcode-lookup/", { params: { code } })
      .then((res) => res.data),
};
