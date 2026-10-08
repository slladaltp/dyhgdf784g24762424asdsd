import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL;
export const api = axios.create({ baseURL: `${BASE}/api`, withCredentials: true });

let refreshing = null;
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const cfg = error.config;
    const skip = /auth\/(login|register|refresh|logout)/.test(cfg?.url || "");
    if (error.response?.status === 401 && cfg && !cfg._retry && !skip) {
      cfg._retry = true;
      refreshing = refreshing || api.post("/auth/refresh").finally(() => { refreshing = null; });
      try {
        await refreshing;
        return api(cfg);
      } catch (e) {
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export const errorText = (e) => {
  const d = e?.response?.data?.detail;
  if (!d) return e?.response ? "Что-то пошло не так. Попробуйте ещё раз." : "Сервер недоступен";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => x?.msg || "").filter(Boolean).join(" ");
  return d.msg || String(d);
};

export const mediaUrl = (url) => (url && url.startsWith("/api/") ? `${BASE}${url}` : url || "");

export const fmtDate = (d, time = false) => {
  if (!d) return "—";
  const opts = { day: "2-digit", month: "short", year: "numeric" };
  if (time) Object.assign(opts, { hour: "2-digit", minute: "2-digit" });
  return new Date(d).toLocaleString("ru-RU", opts);
};

export const fmtMoney = (n) => `${(n ?? 0).toLocaleString("ru-RU")}`;
