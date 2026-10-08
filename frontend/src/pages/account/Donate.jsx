import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, fmtDate } from "@/lib/api";
import { PageHeader, Panel } from "@/components/panel/ui";
import { Console } from "@/components/panel/Console";
import { DELIVERY_STATUS } from "@/pages/Payment";

const S = { pending: "Ожидает оплаты", paid: "Выдаётся", delivered: "Выдано", failed: "Ошибка выдачи", cancelled: "Отменён" };

export function Purchases() {
  const [items, setItems] = useState(null);
  useEffect(() => { api.get("/shop/my-orders").then((r) => setItems(Array.isArray(r.data) ? r.data : [])).catch(() => setItems([])); }, []);
  return (
    <div data-testid="purchases-page">
      <PageHeader kicker="Донат" title="Мои покупки" actions={<Link to="/shop" className="btn-primary h-11 px-5 flex items-center text-sm" data-testid="purchases-shop-link">В магазин</Link>} />
      {items?.length === 0 && <p className="text-sm text-zinc-400 border border-white/10 p-6" data-testid="purchases-empty">Покупок пока нет.</p>}
      <div className="space-y-3">
        {items?.map((o) => (
          <Link key={o.id} to={`/payment/${o.id}`} className="block bg-[#121215] border border-white/10 hover:border-orange-500/50 p-5 transition-colors" data-testid={`purchase-${o.id}`}>
            <div className="flex flex-wrap justify-between gap-3">
              <div className="font-semibold">{o.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}</div>
              <div className="font-display">{o.amount.toLocaleString("ru-RU")} {o.currency}</div>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-zinc-400">
              <span>{fmtDate(o.created_at, true)}</span><span>Ник: {o.mc_nick}</span><span>{o.method_title}</span>
              <span className={o.status === "delivered" ? "text-emerald-400" : o.status === "failed" ? "text-red-400" : "text-amber-300"}>{S[o.status]}</span>
              {o.deliveries.length > 0 && <span>Выдачи: {o.deliveries.filter((d) => ["sent", "confirmed"].includes(d.status)).length}/{o.deliveries.length} {DELIVERY_STATUS.sent.toLowerCase()}</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function ConsolePage() {
  return (
    <div data-testid="console-page">
      <PageHeader kicker="Доступы" title="Консоль сервера" />
      <Panel><Console /></Panel>
    </div>
  );
}
