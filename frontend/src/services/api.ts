import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: attach JWT
api.interceptors.request.use((config) => {
  const url = config.url ?? "";
  if (url.includes("/auth/login") || url.includes("/auth/refresh")) {
    if (config.headers) {
      delete config.headers.Authorization;
    }
    return config;
  }

  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: auto-refresh on 401
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((promise) => {
    if (token) {
      promise.resolve(token);
    } else {
      promise.reject(error);
    }
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const url = originalRequest?.url ?? "";

    // Don't intercept auth endpoints
    if (url.includes("/auth/login") || url.includes("/auth/refresh")) {
      return Promise.reject(error);
    }

    // Auto-refresh on 401
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) {
        processQueue(error, null);
        isRefreshing = false;
        clearAuthAndRedirect();
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(
          `${api.defaults.baseURL}/api/auth/refresh`,
          { refreshToken }
        );
        const newToken = data.accessToken;
        localStorage.setItem("token", newToken);
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAuthAndRedirect();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // 403 = insufficient permissions
    if (error.response?.status === 403) {
      console.warn("Access denied:", url);
    }

    return Promise.reject(error);
  }
);

function clearAuthAndRedirect() {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("role");
  localStorage.removeItem("user");
  localStorage.removeItem("logged_user");
  window.location.href = "/select-role";
}

export default api;
