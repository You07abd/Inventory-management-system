import axios from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
  // Send the httpOnly session cookie with every request.
  withCredentials: true,
  headers: {
    "Content-Type": "application/json"
  }
});

// On an expired/invalid session, bounce to login (except while already logging in).
let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";
    if (status === 401 && !url.includes("/auth/login") && typeof onUnauthorized === "function") {
      onUnauthorized();
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(err) {
  const detail = err?.response?.data?.detail;
  if (Array.isArray(detail)) return detail.map((d) => d.msg).join(", ");
  if (typeof detail === "string") return detail;
  return err?.message || "An unexpected error occurred.";
}

export default client;
