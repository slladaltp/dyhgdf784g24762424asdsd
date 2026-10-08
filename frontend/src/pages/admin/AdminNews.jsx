import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, ExternalLink, Star } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/context/AuthContext";
import { api, errorText, fmtDate, mediaUrl } from "@/lib/api";
import { PageHeader, StatusBadge } from "@/components/panel/ui";

const FILTERS = [["", "Все"], ["published", "Опубликованные"], ["draft", "Черновики"]];

const DeleteButton = ({ item, onDone }) => {
  const remove = async () => {
    try {
      await api.delete(`/admin/news/${item.id}`);
      toast.success("Новость удалена");
      onDone();
    } catch (e) {
      toast.error(errorText(e));
    }
  };
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button className="w-9 h-9 flex items-center justify-center border border-white/10 text-zinc-300 hover:text-red-400 hover:border-red-500/50" aria-label="Удалить" data-testid={`admin-news-delete-${item.id}`}><Trash2 size={15} /></button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-none bg-[#0f0f12] border-white/10">
        <AlertDialogHeader>
          <AlertDialogTitle>Удалить новость?</AlertDialogTitle>
          <AlertDialogDescription>«{item.title}» исчезнет с сайта навсегда.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-none">Отмена</AlertDialogCancel>
          <AlertDialogAction onClick={remove} className="rounded-none bg-red-600 hover:bg-red-500 text-white" data-testid="admin-news-delete-confirm">Удалить</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default function AdminNews() {
  const { can } = useAuth();
  const [filter, setFilter] = useState("");
  const [items, setItems] = useState(null);

  const load = useCallback(() => {
    api.get("/admin/news", { params: { status: filter } }).then((r) => setItems(Array.isArray(r.data) ? r.data : [])).catch(() => setItems([]));
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  const togglePublish = async (item, published) => {
    try {
      await api.post(`/admin/news/${item.id}/publish`, { published });
      toast.success(published ? "Опубликовано на сайте" : "Снято с публикации");
      load();
    } catch (e) {
      toast.error(errorText(e));
    }
  };

  return (
    <div data-testid="admin-news-page">
      <PageHeader kicker="Админ-панель" title="Новости"
        actions={can("news.create") && <Link to="/admin/news/new" className="btn-primary h-11 px-5 flex items-center gap-2 text-sm" data-testid="admin-news-create-btn"><Plus size={16} />Создать</Link>} />
      <div className="flex flex-wrap gap-2 mb-5">
        {FILTERS.map(([v, l]) => (
          <button key={v || "all"} onClick={() => setFilter(v)} data-testid={`admin-news-filter-${v || "all"}`}
            className={`h-10 px-4 text-sm border transition-colors ${filter === v ? "bg-[#FF6B00] text-black border-[#FF6B00]" : "border-white/10 text-zinc-300 hover:border-orange-500/50"}`}>{l}</button>
        ))}
      </div>
      <div className="space-y-3">
        {items?.length === 0 && <p className="text-sm text-zinc-400 border border-white/10 p-6" data-testid="admin-news-empty">Новостей нет.</p>}
        {items?.map((n, i) => (
          <motion.div key={n.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-[#121215] border border-white/10 hover:border-white/20 transition-colors" data-testid={`admin-news-row-${n.id}`}>
            <div className="w-full sm:w-28 aspect-[16/10] shrink-0 overflow-hidden bg-black">
              {n.cover_url && <img src={mediaUrl(n.cover_url)} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={n.status} />
                <span className="font-mono text-[11px] uppercase tracking-widest text-orange-400">{n.tag}</span>
                {n.featured && <Star size={13} className="text-amber-400 fill-amber-400" />}
              </div>
              <div className="font-semibold mt-2 truncate" data-testid={`admin-news-title-${n.id}`}>{n.title}</div>
              <div className="text-xs text-zinc-400 mt-1">{n.author_name || "—"} · {fmtDate(n.published_at || n.created_at)}</div>
            </div>
            <div className="flex items-center gap-3 sm:gap-2">
              {can("news.publish") && (
                <label className="flex items-center gap-2 text-xs text-zinc-300 mr-2">
                  <Switch checked={n.status === "published"} onCheckedChange={(v) => togglePublish(n, v)} data-testid={`admin-news-publish-${n.id}`} />
                  Публикация
                </label>
              )}
              {n.status === "published" && (
                <a href={`/news/${n.slug}`} target="_blank" rel="noreferrer" className="w-9 h-9 flex items-center justify-center border border-white/10 text-zinc-300 hover:text-white" aria-label="Открыть" data-testid={`admin-news-view-${n.id}`}><ExternalLink size={15} /></a>
              )}
              {can("news.edit") && <Link to={`/admin/news/${n.id}`} className="w-9 h-9 flex items-center justify-center border border-white/10 text-zinc-300 hover:text-orange-400 hover:border-orange-500/50" aria-label="Редактировать" data-testid={`admin-news-edit-${n.id}`}><Pencil size={15} /></Link>}
              {can("news.delete") && <DeleteButton item={n} onDone={load} />}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
