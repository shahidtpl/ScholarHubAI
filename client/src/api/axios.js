import axios from "axios";

const normalizeApiBaseUrl = (apiUrl) => {
  const trimmedUrl = apiUrl?.trim().replace(/\/+$/, "");
  if (!trimmedUrl) {
    return import.meta.env.DEV ? "/api" : undefined;
  }

  return /\/api$/i.test(trimmedUrl) ? trimmedUrl : `${trimmedUrl}/api`;
};

const apiBaseUrl = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (!apiBaseUrl) {
    const error = new Error(
      "API URL is not configured. Set VITE_API_URL to your backend URL."
    );
    error.code = "API_URL_MISSING";
    throw error;
  }

  const token = localStorage.getItem("scholarhub_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || "";
      if (!url.includes("/auth/login") && !url.includes("/auth/register")) {
        localStorage.removeItem("scholarhub_token");
        localStorage.removeItem("scholarhub_user");
      }
    }
    return Promise.reject(error);
  }
);

export default api;
