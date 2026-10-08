import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, Loader2, XCircle, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { api, errorText, fmtDate } from "@/lib/api";
import { Nav } from "@/components/site/Nav";
import { FullLoader } from "@/components/auth/Guards";

const ORDER_STATUS = {
  pending: ["Ожидает оплаты", Clock, "#FFB800"], paid: ["Оплачен, выдаём", Loader2, "#38BDF8"], delivered: ["Выдано", CheckCircle2, "#22C55E"],
  failed: ["Ошибка выдачи, мы уже разбираемся", XCircle, "#ef4444"], cancelled: ["Отменён", XCircle, "#a1a1aa"],
};
export const DELIVERY_STATUS = { pending: "В очереди", sent: "Отправлено", confirmed: "Подтверждено", failed: "Ошибка" };

export default function Payment() {
  const { orderId } = useParams();
  const [o, setO] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api.get(`/shop/orders/${orderId}`).then((r) => setO(r.data)).catch(() => setO(false)), [orderId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [load]);

  const demoPay = async () => {
    setBusy(true);
    try { setO((await api.post(`/shop/orders/${orderId}/demo-pay`)).data); toast.success("Оплата принята (демо)"); } catch (e) { toast.error(errorText(e)); } finally { setBusy(false); }
  };

  if (o === null) return <FullLoader />;
  const [label, Icon, color] = ORDER_STATUS[o?.status] || ORDER_STATUS.pending;
  return (
    <div className="bg-[#09090B] min-h-screen grain" data-testid="payment-page">
      <Nav />
      <div className="max-w-2xl mx-auto px-5 pt-32 pb-24">
        {o === false ? <p className="text-center text-zinc-300" data-testid="payment-not-found">Заказ не найден. <Link to="/shop" className="text-orange-400">В магазин</Link></p> : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#121215] border border-white/10">
            <div className="h-1" style={{ background: color }} />
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-3" style={{ color }}><Icon size={26} className={o.status === "paid" ? "animate-spin" : ""} /><span className="font-display uppercase text-xl" data-testid="payment-status">{label}</span></div>
              <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                <div><div className="text-zinc-400">Ник</div><div className="font-semibold">{o.mc_nick}</div></div>
                <div><div className="text-zinc-400">Сумма</div><div className="font-semibold" data-testid="payment-amount">{o.amount.toLocaleString("ru-RU")} {o.currency}</div></div>
                <div><div className="text-zinc-400">Способ</div><div className="font-semibold">{o.method_title}</div></div>
                <div><div className="text-zinc-400">Создан</div><div className="font-semibold">{fmtDate(o.created_at, true)}</div></div>
              </div>
              <div className="mt-5 text-sm text-zinc-300">{o.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}</div>
              {o.status === "pending" && o.demo && (
                <div className="mt-6 border border-amber-400/40 bg-amber-400/10 p-4">
                  <div className="flex items-center gap-2 text-amber-300 text-sm font-semibold"><FlaskConical size={16} />Демо-режим платёжной системы</div>
                  <p className="text-sm text-zinc-300 mt-2">Ключи этой платёжной системы ещё не подключены. Нажмите, чтобы смоделировать успешную оплату и проверить автовыдачу.</p>
                  <button onClick={demoPay} disabled={busy} className="btn-primary h-11 px-6 mt-4 text-sm flex items-center gap-2" data-testid="payment-demo-pay-btn">{busy && <Loader2 size={15} className="animate-spin" />}Оплатить (демо)</button>
                </div>
              )}
              {o.deliveries?.length > 0 && (
                <div className="mt-6 border-t border-white/10 pt-5 space-y-2" data-testid="payment-deliveries">
                  {o.deliveries.map((d) => (
                    <div key={d.id} className="flex justify-between text-sm"><span className="text-zinc-300">{d.product_name} · {d.server_name}</span><span className={d.status === "failed" ? "text-red-400" : d.status === "pending" ? "text-amber-300" : "text-emerald-400"}>{DELIVERY_STATUS[d.status]}</span></div>
                  ))}
                </div>
              )}
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/purchases" className="btn-primary h-11 px-6 flex items-center text-sm" data-testid="payment-purchases-link">Мои покупки</Link>
                <Link to="/shop" className="h-11 px-6 flex items-center text-sm border border-white/15" data-testid="payment-shop-link">В магазин</Link>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
