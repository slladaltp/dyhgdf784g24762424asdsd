import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, TrendingUp, Wallet, Clock } from "lucide-react";
import { api, fmtMoney } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { UserAvatar, RoleBadge } from "@/components/panel/ui";

const EASE = [0.16, 1, 0.3, 1];
export const BOARDS = [
  { id: "level", label: "Уровень", icon: TrendingUp, value: (p) => `${p.level} ур.`, unit: "Уровень" },
  { id: "wealth", label: "Богатство", icon: Wallet, value: (p) => `${fmtMoney(p.wealth)} мон.`, unit: "Монеты" },
  { id: "hours", label: "Часы в игре", icon: Clock, value: (p) => `${fmtMoney(p.hours)} ч`, unit: "Наиграно" },
];
const PODIUM = [{ i: 1, h: "h-28 sm:h-36", c: "#C0C0C0" }, { i: 0, h: "h-36 sm:h-48", c: "#FFB800" }, { i: 2, h: "h-20 sm:h-28", c: "#CD7F32" }];

const Podium = ({ top, board }) => (
  <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end max-w-3xl mx-auto" data-testid="leaderboard-podium">
    {PODIUM.map(({ i, h, c }, k) => {
      const p = top[i];
      return (
        <motion.div key={`${board.id}-${i}`} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.15 * k, ease: EASE }}
          className="flex flex-col items-center text-center min-w-0">
          {p ? (
            <Link to={`/player/${p.username}`} className="group flex flex-col items-center min-w-0 w-full" data-testid={`podium-${i + 1}`}>
              {i === 0 && <Crown className="text-[#FFB800] mb-2 drop-shadow-[0_0_12px_#FFB800]" size={28} />}
              <UserAvatar user={p} size={i === 0 ? 84 : 64} className="clip-frame transition-transform group-hover:scale-105" />
              <div className="font-display uppercase text-xs sm:text-base mt-3 truncate max-w-full">{p.username}</div>
              <div className="font-mono text-[11px] sm:text-xs text-zinc-300 mt-1">{board.value(p)}</div>
            </Link>
          ) : <div className="h-24" />}
          <div className={`w-full ${h} mt-4 relative overflow-hidden border-t-2`} style={{ borderColor: c, background: `linear-gradient(180deg, ${c}33, transparent)` }}>
            <span className="absolute inset-0 flex items-center justify-center font-display text-4xl sm:text-6xl" style={{ color: c }}>{i + 1}</span>
          </div>
        </motion.div>
      );
    })}
  </div>
);

const Row = ({ p, board, mine, idx }) => (
  <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(idx, 15) * 0.03 }}>
    <Link to={`/player/${p.username}`} data-testid={`leaderboard-row-${p.username}`}
      className={`grid grid-cols-[48px_1fr_auto] sm:grid-cols-[64px_1fr_160px_160px] items-center gap-3 px-4 sm:px-6 py-4 border-b border-white/5 hover:bg-white/[0.03] transition-colors ${mine ? "bg-[#FF6B00]/10 border-l-2 border-l-[#FF6B00]" : ""}`}>
      <span className="font-display text-lg text-zinc-400">#{p.rank}</span>
      <span className="flex items-center gap-3 min-w-0">
        <UserAvatar user={p} size={36} />
        <span className="min-w-0">
          <span className="block text-sm font-semibold truncate">{p.username}{mine && <span className="text-orange-400"> · вы</span>}</span>
          <span className="block text-xs text-zinc-400 truncate">{p.faction} · {p.server}</span>
        </span>
      </span>
      <span className="hidden sm:block"><RoleBadge role={p.role} /></span>
      <span className="font-display text-sm sm:text-base text-right">{board.value(p)}</span>
    </Link>
  </motion.div>
);

export default function Leaderboard() {
  const { user } = useAuth();
  const [by, setBy] = useState("level");
  const [rows, setRows] = useState(null);
  const board = BOARDS.find((b) => b.id === by);

  useEffect(() => {
    let alive = true;
    setRows(null);
    api.get("/leaderboard", { params: { by, limit: 50 } })
      .then((r) => alive && setRows(Array.isArray(r.data) ? r.data : []))
      .catch(() => alive && setRows([]));
    return () => { alive = false; };
  }, [by]);

  return (
    <div className="bg-[#09090B] min-h-screen grain overflow-x-clip" data-testid="leaderboard-page">
      <Nav />
      <section className="relative pt-28 pb-16 overflow-hidden">
        <img src="/img/mc_hero.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#09090B]/60 via-[#09090B]/80 to-[#09090B]" />
        <div className="relative max-w-[1200px] mx-auto px-5 lg:px-10">
          <div className="font-mono text-xs uppercase tracking-[0.3em] text-orange-400">Зал славы</div>
          <h1 className="font-display uppercase text-4xl sm:text-5xl lg:text-7xl leading-[0.9] mt-4">
            {["Лучшие", "игроки штата"].map((w, i) => (
              <span key={w} className="block overflow-hidden">
                <motion.span className={`block ${i ? "text-gradient" : ""}`} initial={{ y: "110%" }} animate={{ y: 0 }} transition={{ duration: 1.1, delay: 0.2 + i * 0.12, ease: EASE }}>{w}</motion.span>
              </span>
            ))}
          </h1>
          <div className="flex flex-wrap gap-2 mt-10" data-testid="leaderboard-tabs">
            {BOARDS.map((b) => (
              <button key={b.id} onClick={() => setBy(b.id)} data-testid={`leaderboard-tab-${b.id}`}
                className={`relative h-11 px-5 flex items-center gap-2 text-sm border transition-colors ${by === b.id ? "text-black border-[#FF6B00]" : "border-white/15 text-zinc-300 hover:border-orange-500/50"}`}>
                {by === b.id && <motion.span layoutId="lb-tab" className="absolute inset-0 bg-[#FF6B00]" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                <b.icon size={16} className="relative" /><span className="relative">{b.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
      <section className="max-w-[1200px] mx-auto px-5 lg:px-10 pb-24">
        <AnimatePresence initial={false}>
          {rows && rows.length > 0 && <Podium key={by} top={rows.slice(0, 3)} board={board} />}
        </AnimatePresence>
        <div className="mt-12 border border-white/10 bg-[#121215]" data-testid="leaderboard-table">
          <div className="grid grid-cols-[48px_1fr_auto] sm:grid-cols-[64px_1fr_160px_160px] gap-3 px-4 sm:px-6 py-3 border-b border-white/10 font-mono text-[11px] uppercase tracking-widest text-zinc-400">
            <span>#</span><span>Игрок</span><span className="hidden sm:block">Статус</span><span className="text-right">{board.unit}</span>
          </div>
          {rows === null && <p className="p-6 text-sm text-zinc-400">Загрузка…</p>}
          {rows?.length === 0 && <p className="p-6 text-sm text-zinc-400" data-testid="leaderboard-empty">Рейтинг пока пуст.</p>}
          {rows?.map((p, i) => <Row key={p.id} p={p} board={board} idx={i} mine={user && user.id === p.id} />)}
        </div>
        {!user && (
          <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 border border-[#FF6B00]/40 bg-[#FF6B00]/10 p-6">
            <p className="font-display uppercase text-lg">Хочешь в этот список?</p>
            <Link to="/register" className="btn-primary h-12 px-8 flex items-center" data-testid="leaderboard-register-cta">Создать аккаунт</Link>
          </div>
        )}
      </section>
      <Footer />
    </div>
  );
}
