import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, CalendarDays, Trophy, Briefcase, Flag, Server, ArrowLeft } from "lucide-react";
import { api, fmtDate, fmtMoney } from "@/lib/api";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { FullLoader } from "@/components/auth/Guards";
import { UserAvatar, RoleBadge } from "@/components/panel/ui";
import { BOARDS } from "./Leaderboard";

const EASE = [0.16, 1, 0.3, 1];

export default function PlayerProfile() {
  const { username } = useParams();
  const [p, setP] = useState(null);

  useEffect(() => {
    let alive = true;
    setP(null);
    window.scrollTo(0, 0);
    api.get(`/players/${username}`).then((r) => alive && setP(r.data)).catch(() => alive && setP(false));
    return () => { alive = false; };
  }, [username]);

  if (p === null) return <FullLoader />;

  return (
    <div className="bg-[#09090B] min-h-screen grain overflow-x-clip" data-testid="player-page">
      <Nav />
      {p === false ? (
        <div className="pt-40 pb-32 text-center px-5">
          <h1 className="font-display uppercase text-3xl" data-testid="player-not-found">Игрок не найден</h1>
          <Link to="/leaderboard" className="btn-primary inline-flex mt-8 h-12 px-8 items-center">К рейтингу</Link>
        </div>
      ) : (
        <>
          <section className="relative pt-16 overflow-hidden">
            <div className="relative h-56 sm:h-72 overflow-hidden">
              <motion.img src="/img/mc_nether.jpg" alt="" className="w-full h-full object-cover" initial={{ scale: 1.2 }} animate={{ scale: 1 }} transition={{ duration: 1.6, ease: EASE }} />
              <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-[#09090B]/50 to-transparent" />
            </div>
            <div className="relative max-w-[1200px] mx-auto px-5 lg:px-10 -mt-20 flex flex-col sm:flex-row sm:items-end gap-6">
              <motion.div initial={{ opacity: 0, y: 30, rotate: -4 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ duration: 0.9, ease: EASE }}>
                <UserAvatar user={p} size={136} className="clip-frame border-4 border-[#09090B]" />
              </motion.div>
              <div className="flex-1 min-w-0 pb-2">
                <Link to="/leaderboard" className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-orange-400 mb-3" data-testid="player-back"><ArrowLeft size={14} />Рейтинг</Link>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="font-display uppercase text-3xl sm:text-5xl truncate" data-testid="player-username">{p.username}</h1>
                  <RoleBadge role={p.role} />
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3 text-sm text-zinc-300">
                  {p.city && <span className="flex items-center gap-2"><MapPin size={14} className="text-orange-400" />{p.city}</span>}
                  <span className="flex items-center gap-2"><CalendarDays size={14} className="text-orange-400" />На сервере с {fmtDate(p.created_at)}</span>
                </div>
              </div>
            </div>
          </section>
          <section className="max-w-[1200px] mx-auto px-5 lg:px-10 py-12 grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" data-testid="player-ranks">
                {BOARDS.map((b, i) => (
                  <motion.div key={b.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.08 }}
                    className={`p-5 border ${p.ranks[b.id] <= 3 ? "border-[#FF6B00] bg-[#FF6B00]/10" : "border-white/10 bg-[#121215]"}`}>
                    <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-widest text-zinc-400">
                      {b.label}<b.icon size={16} className="text-orange-400" />
                    </div>
                    <div className="font-display text-3xl mt-3" data-testid={`player-rank-${b.id}`}>#{p.ranks[b.id]}</div>
                    <div className="text-sm text-zinc-300 mt-1">{b.value(p)}</div>
                  </motion.div>
                ))}
              </div>
              <div className="bg-[#121215] border border-white/10 p-6">
                <h2 className="font-display uppercase text-sm mb-4">О себе</h2>
                <p className="text-zinc-300 whitespace-pre-line" data-testid="player-bio">{p.bio || "Игрок пока ничего о себе не рассказал."}</p>
              </div>
            </div>
            <div className="bg-[#121215] border border-white/10 p-6">
              <h2 className="font-display uppercase text-sm mb-4">Персонаж</h2>
              <dl className="divide-y divide-white/5">
                {[[Server, "Сервер", p.server], [Flag, "Клан", p.faction], [Briefcase, "Ранг", p.job], [Trophy, "Репутация", fmtMoney(p.reputation)]].map(([I, k, v]) => (
                  <div key={k} className="flex items-center justify-between py-3">
                    <dt className="flex items-center gap-3 text-sm text-zinc-400"><I size={16} className="text-orange-400" />{k}</dt>
                    <dd className="text-sm font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        </>
      )}
      <Footer />
    </div>
  );
}
