import { useCallback, useEffect, useState } from "react";
import { RotateCcw, CheckCheck, Gift, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, errorText, fmtDate } from "@/lib/api";
import { PageHeader, StatTile, fieldCls } from "@/components/panel/ui";

const DS = { pending: ["В очереди", "text-amber-300"], sent: ["Отправлено", "text-sky-300"], confirmed: ["Подтверждено", "text-emerald-400"], failed: ["Ошибка", "text-red-400"] };
const OS = { pending: "Ожидает оплаты", paid: "Оплачен", delivered: "Выдан", failed: "Ошибка", cancelled: "Отменён" };
const tabCls = "rounded-none h-full px-4 data-[state=active]:bg-[#FF6B00] data-[state=active]:text-black";

const GrantDialog = ({ open, onClose, onDone }) => {
  const [products, setProducts] = useState([]);
  const [f, setF] = useState({ mc_nick: "", product_id: "", qty: 1, reason: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) api.get("/admin/products").then((r) => setProducts(Array.isArray(r.data) ? r.data : [])).catch(() => {}); }, [open]);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { const { data } = await api.post("/admin/grant", { ...f, qty: parseInt(f.qty, 10) || 1 }); toast.success(`Выдано: статус «${OS[data.status]}»`); onDone(); onClose(); } catch (err) { toast.error(errorText(err)); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-none bg-[#0f0f12] border-white/10" data-testid="grant-dialog">
        <DialogHeader><DialogTitle className="font-display uppercase">Ручная выдача</DialogTitle><DialogDescription>Команды товара выполнятся на серверах сети, как при оплате.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1"><Label className="text-xs text-zinc-400">Ник игрока</Label><Input required value={f.mc_nick} onChange={(e) => setF({ ...f, mc_nick: e.target.value })} className={fieldCls} data-testid="grant-nick-input" /></div>
          <div className="space-y-1"><Label className="text-xs text-zinc-400">Товар</Label>
            <select required value={f.product_id} onChange={(e) => setF({ ...f, product_id: e.target.value })} className={`${fieldCls} w-full px-3 border`} data-testid="grant-product-select">
              <option value="">Выберите…</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name} (${p.price_usd})</option>)}
            </select></div>
          <div className="grid grid-cols-[100px_1fr] gap-3">
            <div className="space-y-1"><Label className="text-xs text-zinc-400">Кол-во</Label><Input type="number" min={1} value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} className={fieldCls} /></div>
            <div className="space-y-1"><Label className="text-xs text-zinc-400">Причина</Label><Input value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} className={fieldCls} data-testid="grant-reason-input" /></div>
          </div>
          <button type="submit" disabled={busy} className="btn-primary w-full h-11 text-sm flex items-center justify-center gap-2" data-testid="grant-submit-btn">{busy && <Loader2 size={15} className="animate-spin" />}Выдать</button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default function AdminDonate() {
  const [orders, setOrders] = useState({ items: [], revenue_usd: 0, paid_count: 0 });
  const [dels, setDels] = useState({ items: [], counts: {} });
  const [q, setQ] = useState("");
  const [dStatus, setDStatus] = useState("");
  const [grant, setGrant] = useState(false);
  const load = useCallback(() => {
    api.get("/admin/orders", { params: { q } }).then((r) => setOrders({ items: r.data?.items ?? [], revenue_usd: r.data?.revenue_usd ?? 0, paid_count: r.data?.paid_count ?? 0 })).catch(() => {});
    api.get("/admin/deliveries", { params: { status: dStatus } }).then((r) => setDels({ items: r.data?.items ?? [], counts: r.data?.counts ?? {} })).catch(() => {});
  }, [q, dStatus]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const act = async (d, action) => {
    try { await api.post(`/admin/deliveries/${d.id}/${action}`); toast.success(action === "retry" ? "Повтор отправлен" : "Выдача подтверждена"); load(); } catch (e) { toast.error(errorText(e)); }
  };

  return (
    <div data-testid="admin-donate-page">
      <PageHeader kicker="Донат" title="Заказы и выдача" actions={<button onClick={() => setGrant(true)} className="btn-primary h-11 px-5 flex items-center gap-2 text-sm" data-testid="admin-grant-btn"><Gift size={16} />Выдать вручную</button>} />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatTile label="Выручка" value={`$${orders.revenue_usd.toLocaleString("ru-RU")}`} accent testId="donate-revenue" />
        <StatTile label="Оплат" value={orders.paid_count} testId="donate-paid" />
        {["pending", "failed", "confirmed"].map((s) => <StatTile key={s} label={DS[s][0]} value={dels.counts[s] ?? 0} testId={`donate-count-${s}`} />)}
      </div>
      <Tabs defaultValue="deliveries">
        <TabsList className="rounded-none bg-[#121215] border border-white/10 h-12 p-1 mb-5">
          <TabsTrigger value="deliveries" className={tabCls} data-testid="donate-tab-deliveries">Очередь выдачи</TabsTrigger>
          <TabsTrigger value="orders" className={tabCls} data-testid="donate-tab-orders">Заказы</TabsTrigger>
        </TabsList>
        <TabsContent value="deliveries">
          <div className="flex flex-wrap gap-2 mb-4">
            {["", "pending", "sent", "failed", "confirmed"].map((s) => (
              <button key={s || "all"} onClick={() => setDStatus(s)} className={`h-9 px-3 text-sm border ${dStatus === s ? "bg-[#FF6B00] text-black border-[#FF6B00]" : "border-white/10 text-zinc-300"}`} data-testid={`deliveries-filter-${s || "all"}`}>{s ? DS[s][0] : "Все"}</button>
            ))}
          </div>
          <div className="bg-[#121215] border border-white/10">
            {dels.items.length === 0 && <p className="p-6 text-sm text-zinc-400">Пусто.</p>}
            {dels.items.map((d) => (
              <div key={d.id} className="flex flex-col md:flex-row md:items-center gap-3 px-5 py-4 border-b border-white/5 last:border-0" data-testid={`delivery-row-${d.id}`}>
                <div className="flex-1 min-w-0">
                  <div className="text-sm"><b>{d.mc_nick}</b> · {d.product_name} · <span className="text-orange-400">{d.server_name}</span> <span className="text-zinc-500">({d.mode})</span></div>
                  <div className="font-mono text-[11px] text-zinc-400 truncate mt-1">/{d.command}</div>
                  <div className="font-mono text-[11px] text-zinc-500 truncate">{d.response} · попыток {d.attempts} · {fmtDate(d.created_at, true)}</div>
                </div>
                <span className={`font-mono text-xs uppercase ${DS[d.status]?.[1]}`}>{DS[d.status]?.[0]}</span>
                <div className="flex gap-2">
                  <button onClick={() => act(d, "retry")} className="h-9 px-3 flex items-center gap-1.5 text-xs border border-white/10 hover:border-orange-500/60" data-testid={`delivery-retry-${d.id}`}><RotateCcw size={13} />Повторить</button>
                  {d.status !== "confirmed" && <button onClick={() => act(d, "confirm")} className="h-9 px-3 flex items-center gap-1.5 text-xs border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10" data-testid={`delivery-confirm-${d.id}`}><CheckCheck size={13} />Выдано</button>}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="orders">
          <div className="relative mb-4"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" /><Input placeholder="Ник или аккаунт" value={q} onChange={(e) => setQ(e.target.value)} className={`${fieldCls} pl-10`} data-testid="orders-search" /></div>
          <div className="bg-[#121215] border border-white/10">
            {orders.items.map((o) => (
              <div key={o.id} className="grid grid-cols-[1fr_auto] gap-2 px-5 py-4 border-b border-white/5 last:border-0" data-testid={`order-row-${o.id}`}>
                <div className="min-w-0"><div className="text-sm font-semibold truncate">{o.mc_nick} · {o.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}</div>
                  <div className="text-xs text-zinc-400 mt-1">{fmtDate(o.created_at, true)} · {o.manual ? `вручную: ${o.granted_by}` : `${o.method} · ${o.username}`}</div></div>
                <div className="text-right"><div className="font-display text-sm">{o.manual ? "—" : `${o.amount.toLocaleString("ru-RU")} ${o.currency}`}</div><div className="text-xs text-zinc-300 mt-1">{OS[o.status]}</div></div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
      <GrantDialog open={grant} onClose={() => setGrant(false)} onDone={load} />
    </div>
  );
}
