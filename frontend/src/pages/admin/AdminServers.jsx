import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Wifi, Loader2, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/context/AuthContext";
import { api, errorText, fmtMoney } from "@/lib/api";
import { PageHeader, fieldCls } from "@/components/panel/ui";
import { PluginDocs } from "./PluginDocs";

const copy = async (text) => {
  try { await navigator.clipboard.writeText(text); } catch (e) { /* clipboard blocked */ }
  toast.success("Скопировано");
};

const TokenBox = ({ server }) => {
  const [token, setToken] = useState(server.plugin_token);
  const rotate = async () => {
    if (!window.confirm("Выпустить новый токен? Старый перестанет работать.")) return;
    try {
      const r = await api.post(`/admin/servers/${server.id}/token`);
      setToken(r.data?.plugin_token ?? "");
      toast.success("Новый токен выпущен");
    } catch (e) {
      toast.error(errorText(e));
    }
  };
  return (
    <div className="border border-white/10 p-3 space-y-2" data-testid="server-token-box">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-400">X-Server-Token</span>
        <div className="flex gap-1">
          <button type="button" onClick={() => copy(token)} className="w-8 h-8 flex items-center justify-center border border-white/10 hover:border-orange-500/60" aria-label="Скопировать" data-testid="server-token-copy"><Copy size={13} /></button>
          <button type="button" onClick={rotate} className="w-8 h-8 flex items-center justify-center border border-white/10 hover:border-orange-500/60" aria-label="Новый токен" data-testid="server-token-rotate"><RefreshCw size={13} /></button>
        </div>
      </div>
      <div className="font-mono text-xs text-orange-300 break-all" data-testid="server-plugin-token">{token || "—"}</div>
    </div>
  );
};

const lastSeen = (s) => {
  if (s.mode !== "plugin") return s.rcon_host ? `RCON ${s.rcon_host}:${s.rcon_port}` : "RCON не настроен";
  if (!s.last_seen) return "плагин ещё не подключался";
  const sec = Math.round((Date.now() - new Date(s.last_seen).getTime()) / 1000);
  return sec < 120 ? "плагин онлайн" : `плагин: ${Math.round(sec / 60)} мин назад`;
};

const EMPTY = { name: "", ip: "", description: "", online: 0, max_players: 1000, ping: 20, tag: "", order: 0, enabled: true, mode: "rcon", rcon_host: "", rcon_port: 25575, rcon_password: "" };
const FIELDS = [["name", "Название", "text"], ["description", "Описание", "text"], ["ip", "Внутр. адрес (Bungee)", "text"], ["tag", "Метка", "text"], ["online", "Онлайн", "number"], ["max_players", "Слотов", "number"], ["order", "Порядок", "number"], ["rcon_host", "RCON host", "text"], ["rcon_port", "RCON порт", "number"], ["rcon_password", "RCON пароль", "password"]];

const ServerForm = ({ initial, onClose, onSaved }) => {
  const [form, setForm] = useState(initial || EMPTY);
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (initial?.id) await api.put(`/admin/servers/${initial.id}`, form);
      else await api.post("/admin/servers", form);
      toast.success(initial?.id ? "Сервер обновлён" : "Сервер добавлен");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={submit} className="space-y-4" data-testid="server-form">
      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map(([k, l, t]) => (
          <div key={k} className={`space-y-1 ${k === "ip" || k === "name" ? "col-span-2 sm:col-span-1" : ""}`}>
            <Label className="text-xs text-zinc-400">{l}</Label>
            <Input type={t} min={t === "number" ? 0 : undefined} required={k === "name"} value={form[k]} className={fieldCls} data-testid={`server-${k}-input`}
              onChange={(e) => setForm({ ...form, [k]: t === "number" ? Math.max(0, parseInt(e.target.value || "0", 10)) : e.target.value })} />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        {[["rcon", "Автовыдача через RCON"], ["plugin", "Через плагин (API)"]].map(([m, l]) => (
          <button type="button" key={m} onClick={() => setForm({ ...form, mode: m })} data-testid={`server-mode-${m}`}
            className={`flex-1 h-10 text-xs border ${form.mode === m ? "bg-[#FF6B00] text-black border-[#FF6B00]" : "border-white/15 text-zinc-300"}`}>{l}</button>
        ))}
      </div>
      {initial?.id && <TokenBox server={initial} />}
      <label className="flex items-center gap-3 text-sm"><Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} data-testid="server-enabled-switch" />Показывать на сайте</label>
      <button type="submit" disabled={saving} className="btn-primary w-full h-11 text-sm flex items-center justify-center gap-2" data-testid="server-form-submit">
        {saving && <Loader2 size={15} className="animate-spin" />}Сохранить
      </button>
    </form>
  );
};

const ServerCard = ({ s, editable, onEdit, onDelete, i }) => {
  const pct = Math.min(100, Math.round((s.online / s.max_players) * 100));
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
      className={`relative bg-[#121215] border p-5 ${s.enabled ? "border-white/10" : "border-dashed border-white/15 opacity-60"}`} data-testid={`admin-server-${s.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 ${s.enabled ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-zinc-500"}`} />
            <h3 className="font-display uppercase text-lg truncate">{s.name}</h3>
          </div>
          <div className="font-mono text-xs text-zinc-400 mt-2 truncate" data-testid={`admin-server-status-${s.id}`}>{s.description || s.ip} · {lastSeen(s)}</div>
        </div>
        {s.tag && <span className="font-mono text-[11px] uppercase tracking-widest bg-orange-500/15 text-orange-300 px-2 py-1 shrink-0">{s.tag}</span>}
      </div>
      <div className="mt-5 flex justify-between font-mono text-sm">
        <span>{fmtMoney(s.online)} / {fmtMoney(s.max_players)}</span>
        <span className="flex items-center gap-1 text-emerald-400"><Wifi size={14} />{s.ping} мс</span>
      </div>
      <div className="mt-2 h-1.5 bg-white/10 overflow-hidden">
        <motion.div className="h-full bg-gradient-to-r from-[#FF6B00] to-[#FFB800]" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.2 }} />
      </div>
      {editable && (
        <div className="flex gap-2 mt-5">
          <button onClick={onEdit} className="flex-1 h-9 flex items-center justify-center gap-2 text-sm border border-white/10 hover:border-orange-500/60" data-testid={`admin-server-edit-${s.id}`}><Pencil size={14} />Изменить</button>
          <button onClick={onDelete} className="w-9 h-9 flex items-center justify-center border border-white/10 text-zinc-300 hover:text-red-400 hover:border-red-500/50" aria-label="Удалить" data-testid={`admin-server-delete-${s.id}`}><Trash2 size={14} /></button>
        </div>
      )}
    </motion.div>
  );
};

export default function AdminServers() {
  const { can } = useAuth();
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const editable = can("servers.manage");

  const load = useCallback(() => {
    api.get("/admin/servers").then((r) => setItems(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async (s) => {
    if (!window.confirm(`Удалить сервер «${s.name}»?`)) return;
    try {
      await api.delete(`/admin/servers/${s.id}`);
      toast.success("Сервер удалён");
      load();
    } catch (e) {
      toast.error(errorText(e));
    }
  };

  const total = items.filter((s) => s.enabled).reduce((a, s) => a + s.online, 0);
  return (
    <div data-testid="admin-servers-page">
      <PageHeader kicker={`Онлайн на сайте: ${fmtMoney(total)}`} title="Игровые сервера"
        actions={editable && <button onClick={() => setEditing({})} className="btn-primary h-11 px-5 flex items-center gap-2 text-sm" data-testid="admin-server-create-btn"><Plus size={16} />Добавить сервер</button>} />
      <p className="text-sm text-zinc-400 -mt-4 mb-6">Изменения сразу отображаются в блоке «Сервера» на главной странице.</p>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((s, i) => <ServerCard key={s.id} s={s} i={i} editable={editable} onEdit={() => setEditing(s)} onDelete={() => remove(s)} />)}
      </div>
      <PluginDocs />
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="rounded-none bg-[#0f0f12] border-white/10 max-h-[90vh] overflow-y-auto" data-testid="server-dialog">
          <DialogHeader>
            <DialogTitle className="font-display uppercase">{editing?.id ? "Редактировать сервер" : "Новый сервер"}</DialogTitle>
            <DialogDescription>Данные карточки сервера на сайте.</DialogDescription>
          </DialogHeader>
          {editing && <ServerForm key={editing.id || "new"} initial={editing.id ? editing : null} onClose={() => setEditing(null)} onSaved={load} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
