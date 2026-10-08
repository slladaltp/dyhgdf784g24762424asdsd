import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, UserCog, Newspaper, ShieldCheck, Server, FileDown } from "lucide-react";
import { api, fmtDate } from "@/lib/api";
import { PageHeader } from "@/components/panel/ui";

const FILTERS = [["", "Все"], ["user", "Игроки"], ["news", "Новости"], ["role", "Роли"], ["server", "Сервера"], ["users.export", "Экспорт"]];
const META = {
  user: [UserCog, "#38BDF8"], news: [Newspaper, "#FF6B00"], role: [ShieldCheck, "#A78BFA"], server: [Server, "#22C55E"], users: [FileDown, "#FFB800"],
};

export default function AdminAudit() {
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    api.get("/admin/audit", { params: { action: filter, page } })
      .then((r) => alive && setData({ items: r.data?.items ?? [], pages: r.data?.pages ?? 1, total: r.data?.total ?? 0 }))
      .catch(() => alive && setData({ items: [], pages: 1, total: 0 }));
    return () => { alive = false; };
  }, [filter, page]);

  return (
    <div data-testid="admin-audit-page">
      <PageHeader kicker="Безопасность" title="Журнал действий" actions={<span className="font-mono text-sm text-zinc-400" data-testid="audit-total">Записей: {data?.total ?? "—"}</span>} />
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map(([v, l]) => (
          <button key={v || "all"} onClick={() => { setFilter(v); setPage(1); }} data-testid={`audit-filter-${v || "all"}`}
            className={`h-10 px-4 text-sm border transition-colors ${filter === v ? "bg-[#FF6B00] text-black border-[#FF6B00]" : "border-white/10 text-zinc-300 hover:border-orange-500/50"}`}>{l}</button>
        ))}
      </div>
      <div className="bg-[#121215] border border-white/10" data-testid="audit-list">
        {data?.items.length === 0 && <p className="p-6 text-sm text-zinc-400" data-testid="audit-empty">Действий пока нет.</p>}
        {data?.items.map((a, i) => {
          const [Icon, color] = META[a.action.split(".")[0]] || [UserCog, "#a1a1aa"];
          return (
            <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
              className="flex items-start gap-4 px-5 py-4 border-b border-white/5 last:border-0" data-testid={`audit-row-${a.id}`}>
              <span className="w-9 h-9 shrink-0 flex items-center justify-center border" style={{ color, borderColor: `${color}55`, background: `${color}14` }}><Icon size={16} /></span>
              <div className="flex-1 min-w-0">
                <div className="text-sm"><span className="text-orange-400 font-semibold">{a.actor_name}</span> <span className="text-white">{a.message}</span></div>
                <div className="font-mono text-[11px] text-zinc-400 mt-1">{a.action} · {fmtDate(a.created_at, true)}</div>
              </div>
            </motion.div>
          );
        })}
      </div>
      {data?.pages > 1 && (
        <div className="flex items-center justify-end gap-3 mt-5">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="w-10 h-10 border border-white/10 flex items-center justify-center disabled:opacity-40" data-testid="audit-prev"><ChevronLeft size={16} /></button>
          <span className="font-mono text-sm">{page} / {data.pages}</span>
          <button disabled={page >= data.pages} onClick={() => setPage(page + 1)} className="w-10 h-10 border border-white/10 flex items-center justify-center disabled:opacity-40" data-testid="audit-next"><ChevronRight size={16} /></button>
        </div>
      )}
    </div>
  );
}
