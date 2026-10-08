import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api, errorText } from "@/lib/api";
import { PageHeader, Panel, fieldCls } from "@/components/panel/ui";

const ST = { live: ["Подключено", "text-emerald-400 border-emerald-500/40"], keys: ["Ключи есть, интеграция в работе", "text-sky-300 border-sky-500/40"], demo: ["Демо-режим", "text-amber-300 border-amber-400/40"] };

export default function AdminSettings() {
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get("/admin/settings").then((r) => setS(r.data)).catch(() => {}); }, []);
  const save = async () => {
    setBusy(true);
    try { await api.put("/admin/settings", { network_ip: s.network_ip, rates: s.rates, demo_payments: s.demo_payments }); toast.success("Настройки сохранены"); } catch (e) { toast.error(errorText(e)); } finally { setBusy(false); }
  };
  if (!s) return <p className="text-sm text-zinc-400">Загрузка…</p>;
  return (
    <div className="space-y-4" data-testid="admin-settings-page">
      <PageHeader kicker="Система" title="Настройки" actions={<button onClick={save} disabled={busy} className="btn-primary h-11 px-6 text-sm flex items-center gap-2" data-testid="settings-save-btn">{busy && <Loader2 size={15} className="animate-spin" />}Сохранить</button>} />
      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Сеть BungeeCord">
          <Label className="text-xs text-zinc-400">Единый IP для входа</Label>
          <Input value={s.network_ip} onChange={(e) => setS({ ...s, network_ip: e.target.value })} className={`${fieldCls} mt-2 font-mono`} data-testid="settings-network-ip" />
          <p className="text-xs text-zinc-400 mt-3">Игроки заходят по этому IP в Lobby и через порталы попадают на остальные режимы. Режимы настраиваются в разделе «Сервера».</p>
        </Panel>
        <Panel title="Курсы валют (за 1 USD)">
          <div className="grid grid-cols-3 gap-3">
            {["EUR", "RUB", "UAH"].map((c) => (
              <div key={c} className="space-y-1"><Label className="text-xs text-zinc-400">{c}</Label>
                <Input type="number" step="0.01" min="0.01" value={s.rates[c]} onChange={(e) => setS({ ...s, rates: { ...s.rates, [c]: e.target.value } })} className={fieldCls} data-testid={`settings-rate-${c}`} /></div>
            ))}
          </div>
        </Panel>
      </div>
      <Panel title="Платёжные системы" testId="settings-providers">
        <div className="space-y-2">
          {s.providers.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0">
              <div><div className="text-sm font-semibold">{p.title}</div><div className="font-mono text-[11px] text-zinc-400">{p.currencies.join(", ")}</div></div>
              <span className={`font-mono text-[11px] uppercase tracking-widest border px-2 py-1 ${ST[p.status][1]}`} data-testid={`provider-status-${p.id}`}>{ST[p.status][0]}</span>
            </div>
          ))}
        </div>
        <label className="flex items-center gap-3 text-sm mt-5 pt-5 border-t border-white/10">
          <Switch checked={s.demo_payments} onCheckedChange={(v) => setS({ ...s, demo_payments: v })} data-testid="settings-demo-switch" />
          Демо-оплата для систем без ключей (выключите перед запуском!)
        </label>
      </Panel>
    </div>
  );
}
