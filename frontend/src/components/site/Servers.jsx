import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/currency";
import { Copy, Wifi } from "lucide-react";
import { toast } from "sonner";
import { Reveal, SectionLabel } from "./Reveal";

const SERVERS = [
  { id: 1, name: "Survival", online: 0, max: 500, ping: 14, tag: "Хит" },
  { id: 2, name: "SkyBlock", online: 0, max: 500, ping: 16 },
  { id: 3, name: "BedWars", online: 0, max: 500, ping: 18 },
  { id: 4, name: "Anarchy", online: 0, max: 500, ping: 20, tag: "Новый" },
];

const copyIp = async (ip) => {
  try { await navigator.clipboard.writeText(ip); } catch (e) { /* clipboard blocked */ }
  toast.success("IP скопирован", { description: ip });
};

const ServerCard = ({ s }) => {
  const { config } = useCurrency();
  const ip = config.network_ip;
  const pct = Math.min(100, Math.round((s.online / s.max) * 100));
  return (
    <div className="group relative bg-[#121215] border border-white/10 p-6 hover:border-orange-500/50 transition-colors" data-testid={`server-card-${s.id}`}>
      <div className="flex items-start justify-between">
        <div className="font-mono text-xs text-zinc-400">#{String(s.id).padStart(2, "0")}</div>
        {s.tag && <span className="font-mono text-[11px] uppercase tracking-widest bg-orange-500/15 text-orange-300 px-2 py-1">{s.tag}</span>}
      </div>
      <h3 className="font-display uppercase text-2xl mt-6">{s.name}</h3>
      <div className="mt-6 flex justify-between font-mono text-sm">
        <span className="text-white" data-testid={`server-online-${s.id}`}>{s.online} / {s.max}</span>
        <span className="flex items-center gap-1 text-emerald-400"><Wifi size={14} /> {s.ping} мс</span>
      </div>
      <div className="mt-3 h-1.5 bg-white/10 overflow-hidden">
        <motion.div className="h-full bg-gradient-to-r from-[#FF6B00] to-[#FFB800]" initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }} viewport={{ once: true }} transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }} />
      </div>
      <button onClick={() => copyIp(ip)} data-testid={`server-copy-ip-${s.id}`}
        className="mt-6 w-full h-11 flex items-center justify-between px-4 border border-white/10 font-mono text-xs text-zinc-300 hover:bg-[#FF6B00] hover:text-black hover:border-[#FF6B00] transition-colors">
        {ip} <Copy size={14} />
      </button>
    </div>
  );
};

const useServers = () => {
  const [items, setItems] = useState(SERVERS);
  useEffect(() => {
    let alive = true;
    api.get("/servers").then((r) => {
      if (alive && Array.isArray(r.data)) setItems(r.data.map((s, i) => ({ id: i + 1, name: s.name, ip: s.ip, online: s.online, max: s.max_players || 1, ping: s.ping, tag: s.tag })));
    }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return items;
};

export const Servers = () => {
  const servers = useServers();
  return (
  <section id="servers" className="py-24 lg:py-32" data-testid="servers-section">
    <div className="max-w-[1400px] mx-auto px-5 lg:px-10">
      <Reveal><SectionLabel index="03">Как зайти</SectionLabel></Reveal>
      <Reveal delay={0.1}>
        <h2 className="font-display uppercase text-3xl sm:text-4xl lg:text-6xl mt-6 mb-14 leading-[0.95]">
          Один IP. <span className="text-outline">Все режимы.</span>
        </h2>
      </Reveal>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {servers.map((s, i) => <Reveal key={`${s.id}-${s.name}`} delay={0.08 * i}><ServerCard s={s} /></Reveal>)}
      </div>
    </div>
  </section>
  );
};
