import axios, { type AxiosInstance } from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function createClient(): AxiosInstance {
  const client = axios.create({
    baseURL: `${API_URL}/api/v1`,
    headers: { "Content-Type": "application/json" },
    withCredentials: true,
  });

  client.interceptors.request.use((config) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("indra_token") : null;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  client.interceptors.response.use(
    (r) => r,
    (error) => {
      if (error.response?.status === 401) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("indra_token");
          window.location.href = "/login";
        }
      }
      return Promise.reject(error);
    }
  );

  return client;
}

export const apiClient = createClient();
