import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/context/AuthContext";
import { api, errorText, mediaUrl } from "@/lib/api";
import { PageHeader, fieldCls } from "@/components/panel/ui";
import { CATEGORIES } from "@/pages/Shop";

const EMPTY = { name: "", category: "privilege", price_usd: 1, description: "", image: "/img/mc_case.jpg", features: [], commands: [], server_ids: [], console_group: "", max_qty: 1, popular: false, enabled: true, order: 0 };
const IMAGES = ["/img/mc_hero_char.jpg", "/img/mc_case.jpg", "/img/mc_build.jpg", "/img/mc_pvp.jpg", "/img/mc_nether.jpg", "/img/mc_hero.jpg"];

const ProductForm = ({ initial, servers, tags, onDone }) => {
  const [f, setF] = useState({ ...EMPTY, ...initial });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e?.target ? e.target.value : e });
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body = { ...f, price_usd: parseFloat(f.price_usd) || 0, max_qty: parseInt(f.max_qty, 10) || 1, order: parseInt(f.order, 10) || 0 };
      if (f.id) await api.put(`/admin/products/${f.id}`, body); else await api.post("/admin/products", body);
      toast.success("Товар сохранён");
      onDone();
    } catch (err) { toast.error(errorText(err)); } finally { setBusy(false); }
  };
  const toggleServer = (id) => setF({ ...f, server_ids: f.server_ids.includes(id) ? f.server_ids.filter((x) => x !== id) : [...f.server_ids, id] });
  return (
    <form onSubmit={save} className="space-y-4" data-testid="product-form">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1"><Label className="text-xs text-zinc-400">Название</Label><Input required value={f.name} onChange={set("name")} className={fieldCls} data-testid="product-name-input" /></div>
        <div className="space-y-1"><Label className="text-xs text-zinc-400">Категория</Label>
          <select value={f.category} onChange={set("category")} className={`${fieldCls} w-full px-3 border`} data-testid="product-category-select">
            {CATEGORIES.filter((c) => c.id !== "all").map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select></div>
        <div className="space-y-1"><Label className="text-xs text-zinc-400">Цена, USD</Label><Input type="number" step="0.01" min="0" value={f.price_usd} onChange={set("price_usd")} className={fieldCls} data-testid="product-price-input" /></div>
        <div className="space-y-1"><Label className="text-xs text-zinc-400">Макс. количество</Label><Input type="number" min="1" value={f.max_qty} onChange={set("max_qty")} className={fieldCls} /></div>
        <div className="space-y-1"><Label className="text-xs text-zinc-400">Порядок</Label><Input type="number" value={f.order} onChange={set("order")} className={fieldCls} /></div>
      </div>
      <div className="space-y-1"><Label className="text-xs text-zinc-400">Преимущества (по одному в строке)</Label>
        <Textarea rows={3} value={f.features.join("\n")} onChange={(e) => setF({ ...f, features: e.target.value.split("\n").filter(Boolean) })} className={`${fieldCls} h-auto`} data-testid="product-features-input" /></div>
      <div className="space-y-1"><Label className="text-xs text-zinc-400">Команды выдачи ({"{player}"}, {"{qty}"}) — по одной в строке</Label>
        <Textarea rows={3} value={f.commands.join("\n")} onChange={(e) => setF({ ...f, commands: e.target.value.split("\n").filter(Boolean) })} className={`${fieldCls} h-auto font-mono text-xs`} data-testid="product-commands-input" /></div>
      <div className="space-y-2"><Label className="text-xs text-zinc-400">Сервера выдачи (пусто = все)</Label>
        <div className="flex flex-wrap gap-2">{servers.map((s) => (
          <button type="button" key={s.id} onClick={() => toggleServer(s.id)} className={`h-8 px-3 text-xs border ${f.server_ids.includes(s.id) ? "bg-[#FF6B00] text-black border-[#FF6B00]" : "border-white/15 text-zinc-300"}`}>{s.name}</button>
        ))}</div></div>
      {f.category === "console" && (
        <div className="space-y-1"><Label className="text-xs text-zinc-400">Выдаваемая группа консоли (срок — из настроек группы × количество)</Label>
          <select value={f.console_group || ""} onChange={set("console_group")} className={`${fieldCls} w-full px-3 border`} data-testid="product-group-select">
            <option value="">— нет —</option>{tags.map((t) => <option key={t.name} value={t.name}>{t.title} · {t.duration_days ? `${t.duration_days} дн.` : "навсегда"}</option>)}
          </select></div>
      )}
      <div className="space-y-2"><Label className="text-xs text-zinc-400">Картинка</Label>
        <div className="grid grid-cols-6 gap-2">{IMAGES.map((img) => (
          <button type="button" key={img} onClick={() => setF({ ...f, image: img })} className={`aspect-square border-2 overflow-hidden ${f.image === img ? "border-[#FF6B00]" : "border-transparent opacity-60"}`}><img src={img} alt="" className="w-full h-full object-cover" /></button>
        ))}</div></div>
      <div className="flex gap-6 text-sm">
        <label className="flex items-center gap-2"><Switch checked={f.popular} onCheckedChange={set("popular")} />Хит</label>
        <label className="flex items-center gap-2"><Switch checked={f.enabled} onCheckedChange={set("enabled")} data-testid="product-enabled-switch" />В продаже</label>
      </div>
      <button type="submit" disabled={busy} className="btn-primary w-full h-11 text-sm flex items-center justify-center gap-2" data-testid="product-save-btn">{busy && <Loader2 size={15} className="animate-spin" />}Сохранить</button>
    </form>
  );
};

export default function AdminShop() {
  const { can } = useAuth();
  const [items, setItems] = useState([]);
  const [servers, setServers] = useState([]);
  const [tags, setTags] = useState([]);
  const [edit, setEdit] = useState(null);
  const load = useCallback(() => { api.get("/admin/products").then((r) => setItems(Array.isArray(r.data) ? r.data : [])).catch(() => {}); }, []);
  useEffect(() => {
    load();
    api.get("/servers").then((r) => setServers(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    api.get("/admin/console-groups").then((r) => setTags(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, [load]);
  const remove = async (p) => {
    if (!window.confirm(`Удалить «${p.name}»?`)) return;
    try { await api.delete(`/admin/products/${p.id}`); toast.success("Удалено"); load(); } catch (e) { toast.error(errorText(e)); }
  };
  const editable = can("shop.manage");
  return (
    <div data-testid="admin-shop-page">
      <PageHeader kicker="Донат" title="Товары магазина" actions={editable && <button onClick={() => setEdit({})} className="btn-primary h-11 px-5 flex items-center gap-2 text-sm" data-testid="admin-product-create-btn"><Plus size={16} />Товар</button>} />
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((p) => (
          <div key={p.id} className={`flex gap-4 p-4 bg-[#121215] border ${p.enabled ? "border-white/10" : "border-dashed border-white/15 opacity-60"}`} data-testid={`admin-product-${p.id}`}>
            <img src={mediaUrl(p.image)} alt="" className="w-20 h-20 object-cover shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-widest text-orange-400">{CATEGORIES.find((c) => c.id === p.category)?.label}{p.console_group && ` · группа ${p.console_group}`}</div>
              <div className="font-semibold truncate mt-1">{p.name}</div>
              <div className="font-display mt-1">${p.price_usd}</div>
              <div className="font-mono text-[11px] text-zinc-400 truncate mt-1">{p.commands[0] || "нет команд"}</div>
            </div>
            {editable && <div className="flex flex-col gap-2">
              <button onClick={() => setEdit(p)} className="w-8 h-8 flex items-center justify-center border border-white/10 hover:text-orange-400" aria-label="Изменить" data-testid={`admin-product-edit-${p.id}`}><Pencil size={14} /></button>
              <button onClick={() => remove(p)} className="w-8 h-8 flex items-center justify-center border border-white/10 hover:text-red-400" aria-label="Удалить" data-testid={`admin-product-delete-${p.id}`}><Trash2 size={14} /></button>
            </div>}
          </div>
        ))}
      </div>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="rounded-none bg-[#0f0f12] border-white/10 max-w-xl max-h-[92vh] overflow-y-auto" data-testid="product-dialog">
          <DialogHeader><DialogTitle className="font-display uppercase">{edit?.id ? "Редактировать товар" : "Новый товар"}</DialogTitle><DialogDescription>Цена в USD, на сайте пересчитывается по курсам.</DialogDescription></DialogHeader>
          {edit && <ProductForm key={edit.id || "new"} initial={edit} servers={servers} tags={tags} onDone={() => { setEdit(null); load(); }} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
