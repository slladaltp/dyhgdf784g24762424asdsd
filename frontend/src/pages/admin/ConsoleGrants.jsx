import { useState } from "react";
import { Loader2, UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { api, errorText, fmtDate } from "@/lib/api";
import { fieldCls } from "@/components/panel/ui";

const GrantForm = ({ groups, onDone }) => {
  const [f, setF] = useState({ player: "", group: "", days: "" });
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/admin/console-grants", { player: f.player.trim(), group: f.group, days: f.days === "" ? null : parseInt(f.days, 10) });
      toast.success("Доступ выдан");
      setF({ ...f, player: "", days: "" });
      onDone();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="grid sm:grid-cols-[1fr_1fr_130px_auto] gap-2" data-testid="console-grant-form">
      <Input required placeholder="Аккаунт или ник Minecraft" value={f.player} onChange={(e) => setF({ ...f, player: e.target.value })} className={fieldCls} data-testid="grant-player-input" />
      <select required value={f.group} onChange={(e) => setF({ ...f, group: e.target.value })} className={`${fieldCls} w-full px-3 border`} data-testid="grant-group-select">
        <option value="">Группа консоли…</option>
        {groups.map((g) => <option key={g.name} value={g.name}>{g.title}</option>)}
      </select>
      <Input type="number" min="0" placeholder="Дней" value={f.days} onChange={(e) => setF({ ...f, days: e.target.value })} className={fieldCls} data-testid="grant-days-input" />
      <button type="submit" disabled={busy} className="btn-primary h-11 px-4 flex items-center justify-center gap-2 text-sm" data-testid="grant-console-submit">
        {busy ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}Выдать
      </button>
    </form>
  );
};

export const ConsoleGrants = ({ grants, groups, onChange }) => {
  const title = (name) => groups.find((g) => g.name === name)?.title || name;
  const revoke = async (g) => {
    if (!window.confirm(`Снять «${title(g.group)}» у ${g.username}?`)) return;
    try { await api.delete(`/admin/console-grants/${g.user_id}/${g.group}`); toast.success("Доступ снят"); onChange(); } catch (e) { toast.error(errorText(e)); }
  };
  return (
    <div className="space-y-4" data-testid="console-grants">
      <GrantForm groups={groups} onDone={onChange} />
      <p className="text-xs text-zinc-400">Пустое поле «дней» — срок из настроек группы, 0 — навсегда. Повторная выдача продлевает срок.</p>
      {grants.length === 0 && <p className="text-sm text-zinc-400">Доступов пока нет.</p>}
      <div className="divide-y divide-white/5">
        {grants.map((g) => (
          <div key={`${g.user_id}-${g.group}`} className={`flex flex-wrap items-center gap-x-4 gap-y-1 py-3 ${g.active ? "" : "opacity-60"}`} data-testid={`console-grant-${g.username}-${g.group}`}>
            <span className="font-semibold text-sm">{g.username}</span>
            {g.mc_nick && <span className="font-mono text-xs text-zinc-400">{g.mc_nick}</span>}
            <span className="font-mono text-xs text-orange-300">{title(g.group)}</span>
            <span className="text-xs text-zinc-400">{g.expires_at ? `${g.active ? "до" : "истёк"} ${fmtDate(g.expires_at)}` : "бессрочно"} · выдал {g.granted_by || "—"}</span>
            <button onClick={() => revoke(g)} className="ml-auto h-8 px-3 flex items-center gap-1.5 text-xs border border-white/10 hover:text-red-400 hover:border-red-500/50" data-testid={`grant-revoke-${g.username}-${g.group}`}><UserMinus size={13} />Снять</button>
          </div>
        ))}
      </div>
    </div>
  );
};
