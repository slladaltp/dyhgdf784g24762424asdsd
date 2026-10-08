import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const FALLBACK = { network_ip: "play.yanarpg.ru", rates: { USD: 1, EUR: 0.92, RUB: 92, UAH: 41 }, symbols: { USD: "$", EUR: "€", RUB: "₽", UAH: "₴" }, methods: [] };
const Ctx = createContext({ config: FALLBACK, loaded: false, reload: () => {}, currency: "USD", setCurrency: () => {}, price: (v) => `$${v}` });

export const CurrencyProvider = ({ children }) => {
  const [config, setConfig] = useState(FALLBACK);
  const [loaded, setLoaded] = useState(false);
  const [currency, setCur] = useState(() => localStorage.getItem("yana_currency") || "USD");
  const reload = useCallback(() => api.get("/shop/config").then((r) => {
    if (r.data?.rates) { setConfig(r.data); setLoaded(true); }
  }).catch(() => {}), []);
  useEffect(() => { reload(); }, [reload]);
  const setCurrency = (c) => { localStorage.setItem("yana_currency", c); setCur(c); };
  const price = (usd, cur = currency) => {
    const v = (usd || 0) * (config.rates?.[cur] ?? 1);
    const n = v.toLocaleString("ru-RU", { minimumFractionDigits: cur === "RUB" || cur === "UAH" ? 0 : 2, maximumFractionDigits: cur === "RUB" || cur === "UAH" ? 0 : 2 });
    return `${n} ${config.symbols?.[cur] ?? cur}`;
  };
  return <Ctx.Provider value={{ config, loaded, reload, currency, setCurrency, price }}>{children}</Ctx.Provider>;
};

export const useCurrency = () => useContext(Ctx);

export const CurrencySwitcher = ({ testId = "currency-switcher" }) => {
  const { currency, setCurrency, config } = useCurrency();
  return (
    <div className="flex border border-white/15" data-testid={testId}>
      {Object.keys(config.rates || FALLBACK.rates).map((c) => (
        <button key={c} onClick={() => setCurrency(c)} data-testid={`${testId}-${c}`}
          className={`h-9 px-2.5 font-mono text-xs transition-colors ${currency === c ? "bg-[#FF6B00] text-black" : "text-zinc-300 hover:text-white"}`}>{c}</button>
      ))}
    </div>
  );
};
