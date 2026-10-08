import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, CalendarDays, LogIn, Pencil, Trophy, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api, fmtDate, fmtMoney } from "@/lib/api";
import { Panel, UserAvatar, RoleBadge, ActivityList } from "@/components/panel/ui";

const Cover = ({ user }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} className="relative border border-white/10 overflow-hidden" data-testid="profile-cover">
    <div className="relative h-40 sm:h-56 overflow-hidden">
      <motion.img src="/img/mc_build.jpg" alt="" className="w-full h-full object-cover" initial={{ scale: 1.15 }} animate={{ scale: 1 }} transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }} />
      <div className="absolute inset-0 bg-gradient-to-t from-[#121215] via-[#121215]/40 to-transparent" />
    </div>
    <div className="relative bg-[#121215] px-5 lg:px-8 pb-6 flex flex-col sm:flex-row sm:items-end gap-5 -mt-14 sm:-mt-16">
      <UserAvatar user={user} size={120} className="clip-frame border-4 border-[#121215]" />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display uppercase text-2xl sm:text-4xl truncate" data-testid="profile-username">{user.username}</h1>
          <RoleBadge role={user.role} />
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3 text-sm text-zinc-300">
          {user.city && <span className="flex items-center gap-2"><MapPin size={14} className="text-orange-400" />{user.city}</span>}
          <span className="flex items-center gap-2"><CalendarDays size={14} className="text-orange-400" />С нами с {fmtDate(user.created_at)}</span>
          <span className="flex items-center gap-2"><LogIn size={14} className="text-orange-400" />Вход: {fmtDate(user.last_login, true)}</span>
        </div>
      </div>
      <Link to="/settings" className="h-11 px-5 flex items-center gap-2 text-sm border border-white/15 hover:border-orange-500/60 transition-colors self-start sm:self-end" data-testid="profile-edit-link">
        <Pencil size={15} /> Редактировать
      </Link>
    </div>
  </motion.div>
);

const BigStats = ({ user }) => {
  const items = [["Уровень", user.stats.level], ["Опыт", fmtMoney(user.stats.exp)], ["Часы", user.stats.hours_played], ["Репутация", user.stats.reputation],
    ["Монеты", fmtMoney(user.wallet.cash)], ["Банк монет", fmtMoney(user.wallet.bank)]];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-white/10 border border-white/10" data-testid="profile-stats">
      {items.map(([k, v], i) => (
        <motion.div key={k} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }} className="bg-[#121215] p-5">
          <div className="font-mono text-[11px] uppercase tracking-widest text-zinc-400">{k}</div>
          <div className="font-display text-xl sm:text-2xl mt-2">{v}</div>
        </motion.div>
      ))}
    </div>
  );
};

export default function Profile() {
  const { user } = useAuth();
  const [activity, setActivity] = useState([]);
  useEffect(() => {
    api.get("/users/me/activity", { params: { limit: 6 } }).then((r) => setActivity(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  return (
    <div className="space-y-4" data-testid="profile-page">
      <Cover user={user} />
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Panel title="О себе" testId="profile-bio-panel">
            <p className="text-zinc-300 whitespace-pre-line" data-testid="profile-bio">{user.bio || "Игрок пока ничего о себе не рассказал."}</p>
          </Panel>
          <BigStats user={user} />
        </div>
        <div className="space-y-4">
          <Panel title="Последние события"><ActivityList items={activity} testId="profile-activity" /></Panel>
          <Panel title="Достижения" testId="profile-achievements">
            <div className="flex items-center gap-4 text-zinc-400">
              <div className="w-12 h-12 flex items-center justify-center border border-white/10 relative">
                <Trophy size={20} /><Lock size={12} className="absolute -right-1 -bottom-1 text-orange-400" />
              </div>
              <p className="text-sm">Система достижений откроется вместе с запуском серверов.</p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
