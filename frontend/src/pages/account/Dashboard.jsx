import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Wallet, Landmark, Gem, Clock, Download, CreditCard, Settings, Server, Flag, Briefcase, Star } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { api, fmtMoney, fmtDate } from "@/lib/api";
import { PageHeader, Panel, StatTile, UserAvatar, RoleBadge, ActivityList } from "@/components/panel/ui";

const soon = (what) => toast(`${what} скоро`, { description: "Функция появится в следующих обновлениях." });

const LevelCard = ({ user }) => {
  const need = user.stats.level * 1000;
  const pct = Math.min(100, Math.round((user.stats.exp / need) * 100));
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
      className="relative overflow-hidden border border-white/10 min-h-[220px]" data-testid="dashboard-hero-card">
      <img src="/img/mc_hero.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#09090B] via-[#09090B]/85 to-[#09090B]/30" />
      <div className="relative p-6 lg:p-8 flex flex-col sm:flex-row sm:items-center gap-6">
        <UserAvatar user={user} size={88} className="clip-frame" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display uppercase text-2xl sm:text-3xl truncate" data-testid="dashboard-username">{user.username}</h2>
            <RoleBadge role={user.role} />
          </div>
          <div className="mt-2 text-sm text-zinc-300">На сервере с {fmtDate(user.created_at)}</div>
          <div className="mt-6 max-w-md">
            <div className="flex justify-between font-mono text-xs uppercase tracking-widest">
              <span className="text-orange-400" data-testid="dashboard-level">Уровень {user.stats.level}</span>
              <span className="text-zinc-300">{fmtMoney(user.stats.exp)} / {fmtMoney(need)} EXP</span>
            </div>
            <div className="mt-2 h-2 bg-white/10 overflow-hidden">
              <motion.div className="h-full bg-gradient-to-r from-[#FF6B00] to-[#FFB800]" initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                transition={{ duration: 1.4, delay: 0.3, ease: [0.16, 1, 0.3, 1] }} />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const GameInfo = ({ stats }) => {
  const rows = [[Server, "Сервер", stats.server], [Flag, "Клан", stats.faction], [Briefcase, "Ранг", stats.job], [Star, "Репутация", stats.reputation]];
  return (
    <Panel title="Персонаж" testId="dashboard-character-panel">
      <dl className="divide-y divide-white/5">
        {rows.map(([Icon, k, v]) => (
          <div key={k} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
            <dt className="flex items-center gap-3 text-sm text-zinc-400"><Icon size={16} className="text-orange-400" />{k}</dt>
            <dd className="text-sm font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const [activity, setActivity] = useState(null);
  const [ranks, setRanks] = useState(null);

  useEffect(() => {
    api.get("/leaderboard/me").then((r) => setRanks(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    api.get("/users/me/activity", { params: { limit: 8 } })
      .then((r) => setActivity(Array.isArray(r.data) ? r.data : []))
      .catch(() => setActivity([]));
  }, []);

  const { wallet, stats } = user;
  return (
    <div data-testid="dashboard-page">
      <PageHeader kicker="Личный кабинет" title={`Привет, ${user.username}`}
        actions={<>
          <button onClick={() => soon("Лаунчер")} className="btn-primary h-11 px-5 flex items-center gap-2 text-sm" data-testid="dashboard-download-btn"><Download size={16} />Скачать лаунчер</button>
          <Link to="/settings" className="h-11 px-5 flex items-center gap-2 text-sm border border-white/15 hover:border-orange-500/60 transition-colors" data-testid="dashboard-settings-link"><Settings size={16} />Настройки</Link>
        </>} />
      <LevelCard user={user} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        <StatTile label="Монеты" value={fmtMoney(wallet.cash)} icon={Wallet} testId="stat-cash" delay={0.05} />
        <StatTile label="Банк монет" value={fmtMoney(wallet.bank)} icon={Landmark} testId="stat-bank" delay={0.1} />
        <StatTile label="YanaCoins" value={fmtMoney(wallet.coins)} icon={Gem} accent testId="stat-coins" delay={0.15} />
        <StatTile label="Часов в игре" value={stats.hours_played} icon={Clock} testId="stat-hours" delay={0.2} />
      </div>
      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <div className="lg:col-span-2">
          <Panel title="История активности" testId="dashboard-activity-panel"
            action={<Link to="/profile" className="font-mono text-xs uppercase tracking-widest text-orange-400 hover:underline" data-testid="dashboard-profile-link">Профиль →</Link>}>
            {activity === null ? <p className="text-sm text-zinc-400">Загрузка…</p> : <ActivityList items={activity} />}
          </Panel>
        </div>
        <div className="space-y-4">
          <Panel title="Место в рейтинге" testId="dashboard-ranks-panel"
            action={<Link to="/leaderboard" className="font-mono text-xs uppercase tracking-widest text-orange-400 hover:underline" data-testid="dashboard-leaderboard-link">Топ →</Link>}>
            <div className="grid grid-cols-3 gap-2">
              {[["level", "Уровень"], ["wealth", "Богатство"], ["hours", "Часы"]].map(([k, l]) => (
                <div key={k} className="border border-white/10 p-3 text-center" data-testid={`dashboard-rank-${k}`}>
                  <div className="font-display text-xl text-orange-400">#{ranks?.[k] ?? "—"}</div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-400 mt-1">{l}</div>
                </div>
              ))}
            </div>
            <Link to={`/player/${user.username}`} className="mt-4 block text-center text-sm text-zinc-300 hover:text-white" data-testid="dashboard-public-profile-link">Мой публичный профиль →</Link>
          </Panel>
          <GameInfo stats={stats} />
          <Panel title="Пополнение" testId="dashboard-topup-panel">
            <p className="text-sm text-zinc-300">Привилегии, кейсы, монеты и наборы — выдаются автоматически на сервере.</p>
            <Link to="/shop" className="mt-5 w-full h-11 flex items-center justify-center gap-2 border border-[#FF6B00]/60 text-orange-300 hover:bg-[#FF6B00] hover:text-black transition-colors text-sm" data-testid="dashboard-topup-btn">
              <CreditCard size={16} /> Открыть магазин
            </Link>
          </Panel>
        </div>
      </div>
    </div>
  );
}
