import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, UserPlus, Radio, Newspaper, Landmark, Gem, Plus, Download } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "@/context/AuthContext";
import { api, fmtMoney } from "@/lib/api";
import { PageHeader, Panel, StatTile, ActivityList } from "@/components/panel/ui";

const ROLE_COLORS = { admin: "#FF6B00", moderator: "#38BDF8", user: "#71717A" };
const PALETTE = ["#FFB800", "#22C55E", "#A78BFA", "#F43F5E"];
const tooltipStyle = { background: "#0b0b0e", border: "1px solid rgba(255,107,0,.4)", borderRadius: 0, color: "#fff", fontSize: 12 };

const useClock = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
};

const RegChart = ({ data }) => (
  <div className="h-64" data-testid="admin-reg-chart">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="reg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF6B00" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#FF6B00" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "#FF6B00", strokeDasharray: 4 }} formatter={(v) => [v, "Регистрации"]} />
        <Area type="monotone" dataKey="count" stroke="#FF6B00" strokeWidth={2.5} fill="url(#reg)" animationDuration={1400} />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

const RolesDonut = ({ data }) => {
  const total = data.reduce((s, r) => s + r.count, 0);
  return (
    <div className="flex items-center gap-6" data-testid="admin-roles-chart">
      <div className="relative w-36 h-36 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="role" innerRadius={46} outerRadius={66} stroke="none" paddingAngle={3} animationDuration={1200}>
              {data.map((r, i) => <Cell key={r.role} fill={ROLE_COLORS[r.role] || PALETTE[i % PALETTE.length]} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl">{total}</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">аккаунтов</span>
        </div>
      </div>
      <ul className="space-y-2 text-sm min-w-0">
        {data.map((r, i) => (
          <li key={r.role} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 shrink-0" style={{ background: ROLE_COLORS[r.role] || PALETTE[i % PALETTE.length] }} />
            <span className="text-zinc-300 truncate">{r.role}</span>
            <span className="font-display ml-auto pl-3">{r.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const OnlineMeter = ({ online }) => {
  const pct = online.max ? Math.round((online.current / online.max) * 100) : 0;
  return (
    <div data-testid="admin-online-meter">
      <div className="flex items-end justify-between">
        <div>
          <div className="font-display text-4xl">{fmtMoney(online.current)}</div>
          <div className="text-sm text-zinc-400 mt-1">из {fmtMoney(online.max)} слотов · {online.servers} серв.</div>
        </div>
        <span className="font-display text-xl text-orange-400">{pct}%</span>
      </div>
      <div className="mt-5 grid grid-cols-20 gap-[3px]" style={{ gridTemplateColumns: "repeat(20, minmax(0, 1fr))" }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.span key={i} className="h-8" initial={{ opacity: 0, scaleY: 0 }} animate={{ opacity: 1, scaleY: 1 }} transition={{ delay: i * 0.03 }}
            style={{ background: i < Math.round(pct / 5) ? (i > 16 ? "#ef4444" : i > 12 ? "#FFB800" : "#FF6B00") : "rgba(255,255,255,.08)" }} />
        ))}
      </div>
    </div>
  );
};

export default function AdminHome() {
  const { user, can } = useAuth();
  const now = useClock();
  const [d, setD] = useState(null);
  useEffect(() => {
    api.get("/admin/stats").then((r) => setD(r.data)).catch(() => setD({}));
  }, []);

  const reg = (d?.registrations ?? []).map((r) => ({ ...r, label: r.date.slice(8, 10) + "." + r.date.slice(5, 7) }));
  const eco = d?.economy ?? {};
  const tiles = [
    ["Всего игроков", fmtMoney(d?.users_total), Users, "admin-stat-users", true],
    ["Новых за 7 дней", `+${d?.users_new_week ?? 0}`, UserPlus, "admin-stat-new"],
    ["Онлайн сейчас", fmtMoney(d?.online?.current), Radio, "admin-stat-online"],
    ["Новостей", `${d?.news_published ?? 0} / ${d?.news_draft ?? 0} черн.`, Newspaper, "admin-stat-news"],
    ["Монет в экономике", fmtMoney((eco.cash ?? 0) + (eco.bank ?? 0)), Landmark, "admin-stat-economy"],
    ["YanaCoins", fmtMoney(eco.coins), Gem, "admin-stat-coins"],
  ];

  return (
    <div data-testid="admin-overview-page">
      <PageHeader kicker={now.toLocaleString("ru-RU", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        title={`Штаб, ${user.username}`}
        actions={<>
          {can("news.create") && <Link to="/admin/news/new" className="btn-primary h-11 px-5 flex items-center gap-2 text-sm" data-testid="admin-create-news-link"><Plus size={16} />Новость</Link>}
          {can("users.view") && <Link to="/admin/users" className="h-11 px-5 flex items-center gap-2 text-sm border border-white/15 hover:border-orange-500/60" data-testid="admin-users-link"><Download size={16} />Игроки</Link>}
        </>} />
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {tiles.map(([l, v, I, id, accent], i) => <StatTile key={id} label={l} value={d ? v : "—"} icon={I} testId={id} delay={i * 0.04} accent={accent} />)}
      </div>
      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <Panel title="Регистрации за 14 дней" className="lg:col-span-2" testId="admin-reg-panel">{d && <RegChart data={reg} />}</Panel>
        <div className="space-y-4">
          <Panel title="Нагрузка серверов" testId="admin-online-panel"
            action={<Link to="/admin/servers" className="font-mono text-xs uppercase tracking-widest text-orange-400 hover:underline" data-testid="admin-servers-link">Сервера →</Link>}>
            {d?.online && <OnlineMeter online={d.online} />}
          </Panel>
          <Panel title="Роли" testId="admin-roles-panel">{d?.roles && <RolesDonut data={d.roles} />}</Panel>
        </div>
      </div>
      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <Panel title="Активность игроков" className="lg:col-span-2" testId="admin-activity-panel">
          {d ? <ActivityList items={d.recent_activity || []} showUser testId="admin-activity" /> : <p className="text-sm text-zinc-400">Загрузка…</p>}
        </Panel>
        <Panel title="Быстрый доступ" testId="admin-quick-panel">
          <div className="flex flex-col gap-2">
            {[["/admin/users", "Пользователи", "users.view"], ["/admin/news", "Новости", null], ["/admin/servers", "Сервера", null], ["/admin/audit", "Журнал действий", "audit.view"], ["/admin/roles", "Роли и права", null]]
              .filter(([, , p]) => !p || can(p))
              .map(([to, label]) => (
                <Link key={to} to={to} className="group flex items-center justify-between h-12 px-4 border border-white/10 hover:border-orange-500/60 hover:bg-orange-500/5 transition-colors text-sm" data-testid={`admin-quick-${to.split("/").pop()}`}>
                  {label}<span className="text-orange-400 transition-transform group-hover:translate-x-1">→</span>
                </Link>
              ))}
            <p className="text-xs text-zinc-400 mt-2">Подсказка: <kbd className="px-1.5 py-0.5 border border-white/20 font-mono">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 border border-white/20 font-mono">K</kbd> — быстрый поиск</p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
