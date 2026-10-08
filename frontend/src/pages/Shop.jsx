import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Copy, Crown, Gift, Coins, Package, Terminal, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, errorText, mediaUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useCurrency, CurrencySwitcher } from "@/lib/currency";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { fieldCls } from "@/components/panel/ui";

const EASE = [0.16, 1, 0.3, 1];
export const CATEGORIES = [
  { id: "all", label: "Всё", icon: Package }, { id: "privilege", label: "Привилегии", icon: Crown }, { id: "case", label: "Кейсы", icon: Gift },
  { id: "currency", label: "Валюта", icon: Coins }, { id: "kit", label: "Наборы", icon: Package }, { id: "console", label: "Консоли", icon: Terminal },
];

const CheckoutDialog = ({ product, onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { config, loaded, reload, currency, setCurrency, price } = useCurrency();
  const [nick, setNick] = useState(user?.mc_nick || "");
  const [qty, setQty] = useState(1);
  const [method, setMethod] = useState("");
  const [busy, setBusy] = useState(false);
  const methods = useMemo(() => (config.methods || []).filter((m) => m.currencies.includes(currency)), [config, currency]);
  useEffect(() => { if (product) reload(); }, [product, reload]);
  useEffect(() => { setMethod(methods[0]?.id || ""); }, [methods]);

  const pay = async () => {
    if (!user) return navigate("/login", { state: { from: "/shop" } });
    setBusy(true);
    try {
      const { data } = await api.post("/shop/checkout", { items: [{ product_id: product.id, qty }], mc_nick: nick, currency, method, origin_url: window.location.origin });
      window.location.href = data.url;
    } catch (e) {
      toast.error(errorText(e));
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-none bg-[#0f0f12] border-white/10 max-w-lg max-h-[92vh] overflow-y-auto" data-testid="checkout-dialog">
        <DialogHeader>
          <DialogTitle className="font-display uppercase text-xl">{product?.name}</DialogTitle>
          <DialogDescription>Выдача автоматически на все сервера сети после оплаты.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Ник в Minecraft</Label>
            <Input value={nick} onChange={(e) => setNick(e.target.value)} placeholder="Steve" maxLength={16} className={fieldCls} data-testid="checkout-nick-input" />
          </div>
          {product?.max_qty > 1 && (
            <div className="space-y-2">
              <Label>Количество (до {product.max_qty})</Label>
              <Input type="number" min={1} max={product.max_qty} value={qty} onChange={(e) => setQty(Math.min(product.max_qty, Math.max(1, parseInt(e.target.value || "1", 10))))} className={fieldCls} data-testid="checkout-qty-input" />
            </div>
          )}
          <div className="space-y-2"><Label>Валюта оплаты</Label><CurrencySwitcher testId="checkout-currency" /></div>
          <div className="space-y-2">
            <Label>Способ оплаты</Label>
            {methods.length === 0 && <p className="text-sm text-zinc-400">{loaded ? "Для этой валюты пока нет способов оплаты." : "Загрузка способов оплаты…"}</p>}
            {methods.map((m) => (
              <button key={m.id} onClick={() => setMethod(m.id)} data-testid={`checkout-method-${m.id}`}
                className={`w-full flex items-center justify-between h-12 px-4 border text-sm transition-colors ${method === m.id ? "border-[#FF6B00] bg-[#FF6B00]/10" : "border-white/10 hover:border-white/25"}`}>
                <span className="flex items-center gap-3">{method === m.id ? <Check size={16} className="text-orange-400" /> : <span className="w-4" />}{m.title}</span>
                {m.demo && <span className="font-mono text-[10px] uppercase tracking-widest text-amber-300 border border-amber-400/40 px-1.5 py-0.5">демо</span>}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-white/10 pt-5">
            <div><div className="font-mono text-[11px] uppercase tracking-widest text-zinc-400">К оплате</div><div className="font-display text-2xl" data-testid="checkout-total">{price((product?.price_usd || 0) * qty)}</div></div>
            <button onClick={pay} disabled={busy || !method || nick.length < 3} className="btn-primary h-12 px-7 flex items-center gap-2 disabled:opacity-50" data-testid="checkout-pay-btn">
              {busy && <Loader2 size={16} className="animate-spin" />}{user ? "Оплатить" : "Войти и оплатить"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ProductCard = ({ p, i, onBuy }) => {
  const { price } = useCurrency();
  return (
    <motion.article initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.7, delay: (i % 4) * 0.06, ease: EASE }}
      whileHover={{ y: -6 }} className={`group relative flex flex-col bg-[#121215] border ${p.popular ? "border-[#FF6B00]" : "border-white/10"}`} data-testid={`product-card-${p.id}`}>
      {p.popular && <span className="absolute z-10 top-3 right-3 font-mono text-[10px] uppercase tracking-widest bg-[#FF6B00] text-black px-2 py-1">Хит</span>}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img src={mediaUrl(p.image) || "/img/mc_case.jpg"} alt={p.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#121215] via-transparent to-transparent" />
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <div className="font-mono text-[11px] uppercase tracking-widest text-orange-400">{CATEGORIES.find((c) => c.id === p.category)?.label}</div>
        <h3 className="font-display uppercase text-xl mt-2">{p.name}</h3>
        <ul className="mt-4 space-y-2 flex-1">
          {p.features.slice(0, 4).map((f) => <li key={f} className="flex gap-2 text-sm text-zinc-300"><Check size={15} className="text-orange-400 shrink-0 mt-0.5" />{f}</li>)}
        </ul>
        <div className="mt-6 flex items-center justify-between gap-3">
          <span className="font-display text-xl" data-testid={`product-price-${p.id}`}>{price(p.price_usd)}</span>
          <button onClick={() => onBuy(p)} className="btn-primary h-11 px-5 text-sm" data-testid={`product-buy-${p.id}`}>Купить</button>
        </div>
      </div>
    </motion.article>
  );
};

export default function Shop() {
  const { config } = useCurrency();
  const [items, setItems] = useState(null);
  const [cat, setCat] = useState("all");
  const [buying, setBuying] = useState(null);
  useEffect(() => {
    api.get("/shop/products").then((r) => setItems(Array.isArray(r.data) ? r.data : [])).catch(() => setItems([]));
  }, []);
  const shown = (items || []).filter((p) => cat === "all" || p.category === cat);
  const copy = () => { navigator.clipboard?.writeText(config.network_ip).catch(() => {}); toast.success("IP скопирован", { description: config.network_ip }); };

  return (
    <div className="bg-[#09090B] min-h-screen grain overflow-x-clip" data-testid="shop-page">
      <Nav />
      <section className="relative pt-28 pb-14 overflow-hidden">
        <img src="/img/mc_case.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-35" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#09090B] via-[#09090B]/80 to-[#09090B]/40" />
        <div className="relative max-w-[1300px] mx-auto px-5 lg:px-10">
          <div className="font-mono text-xs uppercase tracking-[0.3em] text-orange-400">Автодонат</div>
          <h1 className="font-display uppercase text-4xl sm:text-5xl lg:text-7xl leading-[0.9] mt-4">
            {["Магазин", "сети YanaRPG"].map((w, i) => (
              <span key={w} className="block overflow-hidden"><motion.span className={`block ${i ? "text-gradient" : ""}`} initial={{ y: "110%" }} animate={{ y: 0 }} transition={{ duration: 1.1, delay: 0.2 + i * 0.12, ease: EASE }}>{w}</motion.span></span>
            ))}
          </h1>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button onClick={copy} className="h-11 px-4 flex items-center gap-3 border border-white/15 bg-black/40 font-mono text-sm hover:border-orange-500/60" data-testid="shop-copy-ip"><Copy size={15} />{config.network_ip}</button>
            <span className="flex items-center gap-2 text-sm text-zinc-300"><ShieldCheck size={16} className="text-emerald-400" />Выдача за ~10 секунд после оплаты</span>
          </div>
        </div>
      </section>
      <section className="max-w-[1300px] mx-auto px-5 lg:px-10 pb-24">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div className="flex flex-wrap gap-2" data-testid="shop-categories">
            {CATEGORIES.map((c) => (
              <button key={c.id} onClick={() => setCat(c.id)} data-testid={`shop-cat-${c.id}`}
                className={`relative h-10 px-4 flex items-center gap-2 text-sm border ${cat === c.id ? "text-black border-[#FF6B00]" : "border-white/10 text-zinc-300 hover:border-orange-500/50"}`}>
                {cat === c.id && <motion.span layoutId="shop-cat" className="absolute inset-0 bg-[#FF6B00]" />}
                <c.icon size={15} className="relative" /><span className="relative">{c.label}</span>
              </button>
            ))}
          </div>
          <CurrencySwitcher testId="shop-currency" />
        </div>
        {items === null && <p className="text-zinc-400">Загрузка…</p>}
        {items && shown.length === 0 && <p className="text-zinc-400" data-testid="shop-empty">В этой категории пока нет товаров.</p>}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {shown.map((p, i) => <ProductCard key={p.id} p={p} i={i} onBuy={setBuying} />)}
        </div>
      </section>
      <CheckoutDialog product={buying} onClose={() => setBuying(null)} />
      <Footer />
    </div>
  );
}
