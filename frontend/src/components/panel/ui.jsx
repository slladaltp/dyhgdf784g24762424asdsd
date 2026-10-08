import { motion } from "framer-motion";
import { mediaUrl, fmtDate } from "@/lib/api";

const ROLE_STYLES = {
  admin: { label: "Администратор", color: "#FF6B00" },
  moderator: { label: "Модератор", color: "#38BDF8" },
  user: { label: "Игрок", color: "#9CA3AF" },
};

export const PageHeader = ({ kicker, title, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-8 lg:mb-10">
    <div>
      {kicker && <div className="font-mono text-xs uppercase tracking-[0.3em] text-orange-400">{kicker}</div>}
      <h1 className="font-display uppercase text-2xl sm:text-3xl lg:text-4xl mt-3 leading-tight" data-testid="page-title">{title}</h1>
    </div>
    {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
  </div>
);

export const Panel = ({ title, action, children, className = "", testId }) => (
  <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    className={`bg-[#121215] border border-white/10 ${className}`} data-testid={testId}>
    {title && (
      <div className="flex items-center justify-between gap-4 px-5 lg:px-6 py-4 border-b border-white/10">
        <h2 className="font-display uppercase text-sm tracking-wide">{title}</h2>
        {action}
      </div>
    )}
    <div className="p-5 lg:p-6">{children}</div>
  </motion.section>
);

export const StatTile = ({ label, value, icon: Icon, accent, testId, delay = 0 }) => (
  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
    whileHover={{ y: -3 }}
    className={`relative overflow-hidden p-5 border ${accent ? "bg-[#FF6B00] text-black border-[#FF6B00]" : "bg-[#121215] border-white/10"}`}
    data-testid={testId}>
    <div className="flex items-start justify-between gap-3">
      <span className={`font-mono text-[11px] uppercase tracking-widest ${accent ? "text-black/70" : "text-zinc-400"}`}>{label}</span>
      {Icon && <Icon size={18} className={accent ? "text-black" : "text-orange-400"} />}
    </div>
    <div className="font-display text-xl sm:text-2xl mt-4 truncate">{value}</div>
  </motion.div>
);

export const UserAvatar = ({ user, size = 40, className = "" }) => {
  const src = mediaUrl(user?.avatar_url);
  const initials = (user?.username || "?").slice(0, 2).toUpperCase();
  return src ? (
    <img src={src} alt={user?.username} style={{ width: size, height: size }} className={`object-cover shrink-0 ${className}`} />
  ) : (
    <div style={{ width: size, height: size, fontSize: size * 0.36 }}
      className={`shrink-0 flex items-center justify-center bg-gradient-to-br from-[#FF6B00] to-[#FFB800] text-black font-display ${className}`}>
      {initials}
    </div>
  );
};

export const RoleBadge = ({ role, title, color }) => {
  const s = ROLE_STYLES[role] || { label: title || role, color: color || "#A78BFA" };
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest px-2 py-1 border"
      style={{ color: s.color, borderColor: `${s.color}55`, background: `${s.color}14` }} data-testid={`role-badge-${role}`}>
      <span className="w-1.5 h-1.5" style={{ background: s.color }} />{title || s.label}
    </span>
  );
};

export const StatusBadge = ({ status }) => {
  const map = {
    published: ["Опубликовано", "text-emerald-400 border-emerald-500/40 bg-emerald-500/10"],
    draft: ["Черновик", "text-zinc-300 border-white/20 bg-white/5"],
    active: ["Активен", "text-emerald-400 border-emerald-500/40 bg-emerald-500/10"],
    banned: ["Заблокирован", "text-red-400 border-red-500/40 bg-red-500/10"],
  };
  const [label, cls] = map[status] || [status, "text-zinc-300 border-white/20"];
  return <span className={`inline-block font-mono text-[11px] uppercase tracking-widest px-2 py-1 border ${cls}`}>{label}</span>;
};

const ACTIVITY_COLORS = { login: "#22c55e", register: "#FF6B00", security: "#ef4444", profile: "#38BDF8", balance: "#FFB800", role: "#A78BFA" };

export const ActivityList = ({ items, showUser = false, testId = "activity-list" }) => {
  if (!items?.length) return <p className="text-sm text-zinc-400" data-testid={`${testId}-empty`}>Пока нет событий.</p>;
  return (
    <ol className="relative space-y-5 before:absolute before:left-[5px] before:top-2 before:bottom-2 before:w-px before:bg-white/10" data-testid={testId}>
      {items.map((a, i) => (
        <motion.li key={a.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
          className="relative pl-7">
          <span className="absolute left-0 top-1.5 w-[11px] h-[11px] rotate-45" style={{ background: ACTIVITY_COLORS[a.type] || "#9CA3AF" }} />
          <div className="text-sm text-white">{showUser && <span className="text-orange-400 font-semibold">{a.username} · </span>}{a.message}</div>
          <div className="font-mono text-[11px] text-zinc-400 mt-1">{fmtDate(a.created_at, true)}</div>
        </motion.li>
      ))}
    </ol>
  );
};

export const fieldCls = "h-11 rounded-none bg-[#0d0d10] border-white/10 focus-visible:ring-[#FF6B00] focus-visible:border-[#FF6B00]";
