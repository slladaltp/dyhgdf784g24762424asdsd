import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { FileDown } from "lucide-react";
import { motion } from "framer-motion";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, errorText, fmtDate } from "@/lib/api";
import { PageHeader, UserAvatar, RoleBadge, StatusBadge, fieldCls } from "@/components/panel/ui";
import { UserDialog } from "./UserDialog";

export default function AdminUsers() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [roles, setRoles] = useState([]);
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState(params.get("open"));

  useEffect(() => {
    const id = params.get("open");
    if (id) { setSelected(id); setParams({}, { replace: true }); }
  }, [params, setParams]);

  const exportCsv = async () => {
    try {
      const { data } = await api.get("/admin/users/export", { responseType: "blob" });
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "yanarpg_users.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV выгружен");
    } catch (e) {
      toast.error(errorText(e));
    }
  };

  const load = useCallback(() => {
    api.get("/admin/users", { params: { q, role: role === "all" ? "" : role, page } })
      .then((r) => setData({ items: r.data?.items ?? [], total: r.data?.total ?? 0, pages: r.data?.pages ?? 1 }))
      .catch(() => {});
  }, [q, role, page]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);
  useEffect(() => {
    api.get("/admin/roles").then((r) => setRoles(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  const roleMeta = (name) => roles.find((r) => r.name === name) || {};

  return (
    <div data-testid="admin-users-page">
      <PageHeader kicker="Админ-панель" title="Пользователи" actions={<>
        <span className="font-mono text-sm text-zinc-400 self-center" data-testid="admin-users-total">Всего: {data.total}</span>
        <button onClick={exportCsv} className="h-11 px-5 flex items-center gap-2 text-sm border border-white/15 hover:border-orange-500/60" data-testid="admin-users-export-btn"><FileDown size={16} />Экспорт CSV</button>
      </>} />
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <Input placeholder="Поиск по нику или email" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className={`${fieldCls} pl-10`} data-testid="admin-users-search" />
        </div>
        <Select value={role} onValueChange={(v) => { setRole(v); setPage(1); }}>
          <SelectTrigger className={`${fieldCls} sm:w-56`} data-testid="admin-users-role-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все роли</SelectItem>
            {roles.map((r) => <SelectItem key={r.name} value={r.name}>{r.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="border border-white/10 bg-[#121215]">
        <div className="hidden md:grid grid-cols-[2fr_1.2fr_1fr_1fr_0.8fr] gap-4 px-5 py-3 border-b border-white/10 font-mono text-[11px] uppercase tracking-widest text-zinc-400">
          <span>Игрок</span><span>Роль</span><span>Статус</span><span>Регистрация</span><span className="text-right">Уровень</span>
        </div>
        {data.items.length === 0 && <p className="p-6 text-sm text-zinc-400" data-testid="admin-users-empty">Никого не найдено.</p>}
        {data.items.map((u, i) => (
          <motion.button key={u.id} onClick={() => setSelected(u.id)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            className="w-full text-left grid grid-cols-[1fr_auto] md:grid-cols-[2fr_1.2fr_1fr_1fr_0.8fr] gap-3 md:gap-4 items-center px-5 py-4 border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors"
            data-testid={`admin-user-row-${u.username}`}>
            <div className="flex items-center gap-3 min-w-0">
              <UserAvatar user={u} size={36} />
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{u.username}</div>
                <div className="text-xs text-zinc-400 truncate">{u.email}</div>
              </div>
            </div>
            <div className="justify-self-end md:justify-self-start"><RoleBadge role={u.role} title={roleMeta(u.role).title} color={roleMeta(u.role).color} /></div>
            <div className="hidden md:block"><StatusBadge status={u.status} /></div>
            <div className="hidden md:block text-sm text-zinc-300">{fmtDate(u.created_at)}</div>
            <div className="hidden md:block text-right font-display">{u.stats?.level ?? 1}</div>
          </motion.button>
        ))}
      </div>

      {data.pages > 1 && (
        <div className="flex items-center justify-end gap-3 mt-5">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="w-10 h-10 border border-white/10 flex items-center justify-center disabled:opacity-40" data-testid="admin-users-prev"><ChevronLeft size={16} /></button>
          <span className="font-mono text-sm">{page} / {data.pages}</span>
          <button disabled={page >= data.pages} onClick={() => setPage(page + 1)} className="w-10 h-10 border border-white/10 flex items-center justify-center disabled:opacity-40" data-testid="admin-users-next"><ChevronRight size={16} /></button>
        </div>
      )}

      <UserDialog userId={selected} roles={roles} onClose={() => setSelected(null)} onChanged={load} />
    </div>
  );
}
