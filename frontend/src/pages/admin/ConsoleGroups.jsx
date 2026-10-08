import { useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, errorText } from "@/lib/api";
import { fieldCls } from "@/components/panel/ui";

const EMPTY = { name: "", title: "", color: "#FF6B00", tags: [], commands: [], server_ids: [], daily_limit: 0, duration_days: 0 };

const Chips = ({ items, selected, onToggle, testPrefix }) => (
  <div className="flex flex-wrap gap-2">
    {items.map(([id, label]) => (
      <button type="button" key={id} onClick={() => onToggle(id)} data-testid={`${testPrefix}-${id}`}
        className={`h-8 px-3 text-xs border transition-colors ${selected.includes(id) ? "bg-[#FF6B00] text-black border-[#FF6B00]" : "border-white/15 text-zinc-300 hover:border-orange-500/50"}`}>{label}</button>
    ))}
  </div>
);

const GroupForm = ({ initial, tags, servers, onDone }) => {
  const [f, setF] = useState({ ...EMPTY, ...initial });
  const [busy, setBusy] = useState(false);
  const toggle = (k) => (id) => setF({ ...f, [k]: f[k].includes(id) ? f[k].filter((x) => x !== id) : [...f[k], id] });
  const num = (k) => (e) => setF({ ...f, [k]: Math.max(0, parseInt(e.target.value || "0", 10)) });
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (initial?.id) await api.put(`/admin/console-groups/${initial.name}`, f);
      else await api.post("/admin/console-groups", f);
      toast.success("Группа сохранена");
      onDone();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="space-y-4" data-testid="console-group-form">
      <div className="grid grid-cols-[1fr_1fr_44px] gap-3">
        <div className="space-y-1"><Label className="text-xs text-zinc-400">Ключ</Label>
          <Input required disabled={!!initial?.id} pattern="[a-z0-9_]{2,24}" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value.toLowerCase() })} className={fieldCls} data-testid="group-name-input" /></div>
        <div className="space-y-1"><Label className="text-xs text-zinc-400">Название</Label>
          <Input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={fieldCls} data-testid="group-title-input" /></div>
        <div className="space-y-1"><Label className="text-xs text-zinc-400">Цвет</Label>
          <input type="color" value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} className="h-11 w-11 bg-transparent border border-white/10" data-testid="group-color-input" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="text-xs text-zinc-400">Лимит команд в день (0 — без лимита)</Label>
          <Input type="number" min="0" value={f.daily_limit} onChange={num("daily_limit")} className={fieldCls} data-testid="group-limit-input" /></div>
        <div className="space-y-1"><Label className="text-xs text-zinc-400">Срок доступа, дней (0 — навсегда)</Label>
          <Input type="number" min="0" value={f.duration_days} onChange={num("duration_days")} className={fieldCls} data-testid="group-days-input" /></div>
      </div>
      <div className="space-y-2"><Label className="text-xs text-zinc-400">Наборы команд (теги)</Label>
        <Chips items={tags.map((t) => [t.name, t.title])} selected={f.tags} onToggle={toggle("tags")} testPrefix="group-tag" /></div>
      <div className="space-y-1"><Label className="text-xs text-zinc-400">Дополнительные команды — по одной в строке (gamemode*, tp)</Label>
        <Textarea rows={3} value={f.commands.join("\n")} onChange={(e) => setF({ ...f, commands: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
          className={`${fieldCls} h-auto font-mono text-xs`} data-testid="group-commands-input" /></div>
      <div className="space-y-2"><Label className="text-xs text-zinc-400">Доступные сервера (ничего не выбрано — все RCON-сервера)</Label>
        <Chips items={servers.map((s) => [s.id, s.name])} selected={f.server_ids} onToggle={toggle("server_ids")} testPrefix="group-server" /></div>
      <button type="submit" disabled={busy} className="btn-primary w-full h-11 text-sm flex items-center justify-center gap-2" data-testid="group-save-btn">
        {busy && <Loader2 size={15} className="animate-spin" />}Сохранить группу
      </button>
    </form>
  );
};

const GroupCard = ({ g, servers, onEdit, onDelete }) => (
  <div className="bg-[#0d0d10] border border-white/10 p-4 space-y-3" style={{ borderLeft: `3px solid ${g.color}` }} data-testid={`console-group-card-${g.name}`}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="font-display uppercase text-sm truncate" style={{ color: g.color }}>{g.title}</div>
        <div className="font-mono text-[11px] text-zinc-400 mt-1">{g.name} · {g.holders} игрок.</div>
      </div>
      <div className="flex gap-1 shrink-0">
        <button onClick={onEdit} className="w-8 h-8 flex items-center justify-center border border-white/10 hover:text-orange-400" aria-label="Изменить" data-testid={`group-edit-${g.name}`}><Pencil size={13} /></button>
        <button onClick={onDelete} className="w-8 h-8 flex items-center justify-center border border-white/10 hover:text-red-400" aria-label="Удалить" data-testid={`group-delete-${g.name}`}><Trash2 size={13} /></button>
      </div>
    </div>
    <div className="grid grid-cols-3 gap-2 text-center">
      {[["команд", g.patterns.length], ["в день", g.daily_limit || "∞"], ["дней", g.duration_days || "∞"]].map(([k, v]) => (
        <div key={k} className="border border-white/5 py-2"><div className="font-display text-base">{v}</div><div className="text-[11px] text-zinc-400">{k}</div></div>
      ))}
    </div>
    <div className="font-mono text-[11px] text-zinc-300 break-words">{g.patterns.join(", ") || "нет команд"}</div>
    <div className="text-[11px] text-zinc-400">Сервера: {g.server_ids.length ? servers.filter((s) => g.server_ids.includes(s.id)).map((s) => s.name).join(", ") : "все"}</div>
  </div>
);

export const ConsoleGroups = ({ groups, tags, servers, onChange }) => {
  const [edit, setEdit] = useState(null);
  const remove = async (g) => {
    if (!window.confirm(`Удалить группу «${g.title}»? Доступ пропадёт у всех игроков.`)) return;
    try { await api.delete(`/admin/console-groups/${g.name}`); toast.success("Группа удалена"); onChange(); } catch (e) { toast.error(errorText(e)); }
  };
  return (
    <div data-testid="console-groups">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <p className="text-sm text-zinc-400 max-w-xl">Группы консоли не связаны с ролями сайта. В каждой группе свои команды, сервера, лимит в день и срок действия.</p>
        <button onClick={() => setEdit({})} className="btn-primary h-10 px-4 flex items-center gap-2 text-sm shrink-0" data-testid="group-create-btn"><Plus size={15} />Группа</button>
      </div>
      {groups.length === 0 && <p className="text-sm text-zinc-400">Групп пока нет.</p>}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {groups.map((g) => <GroupCard key={g.name} g={g} servers={servers} onEdit={() => setEdit(g)} onDelete={() => remove(g)} />)}
      </div>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="rounded-none bg-[#0f0f12] border-white/10 max-h-[90vh] overflow-y-auto" data-testid="console-group-dialog">
          <DialogHeader>
            <DialogTitle className="font-display uppercase">{edit?.id ? "Группа консоли" : "Новая группа консоли"}</DialogTitle>
            <DialogDescription>Что разрешено, где и сколько раз в день.</DialogDescription>
          </DialogHeader>
          {edit && <GroupForm key={edit.name || "new"} initial={edit.id ? edit : null} tags={tags} servers={servers} onDone={() => { setEdit(null); onChange(); }} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};
