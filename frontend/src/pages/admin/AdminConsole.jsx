import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { api, errorText, fmtDate } from "@/lib/api";
import { PageHeader, Panel, fieldCls } from "@/components/panel/ui";
import { Console } from "@/components/panel/Console";
import { ConsoleGroups } from "./ConsoleGroups";
import { ConsoleGrants } from "./ConsoleGrants";

const TagRow = ({ t, onSaved }) => {
  const [f, setF] = useState({ ...t, patterns: t.patterns.join(", ") });
  const save = async () => {
    try { await api.put(`/admin/rcon-tags/${t.name}`, { ...f, patterns: f.patterns.split(",").map((s) => s.trim()).filter(Boolean) }); toast.success("Тег сохранён"); onSaved(); } catch (e) { toast.error(errorText(e)); }
  };
  const del = async () => { if (window.confirm(`Удалить тег ${t.title}?`)) { await api.delete(`/admin/rcon-tags/${t.name}`).catch(() => {}); onSaved(); } };
  return (
    <div className="grid grid-cols-[40px_1fr] sm:grid-cols-[40px_160px_1fr_auto] gap-2 items-center" data-testid={`rcon-tag-${t.name}`}>
      <input type="color" value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} className="h-10 w-10 bg-transparent border border-white/10" />
      <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={fieldCls} />
      <Input value={f.patterns} onChange={(e) => setF({ ...f, patterns: e.target.value })} className={`${fieldCls} font-mono text-xs col-span-2 sm:col-span-1`} data-testid={`rcon-tag-patterns-${t.name}`} />
      <div className="flex gap-2 col-span-2 sm:col-span-1">
        <button onClick={save} className="h-10 px-3 border border-white/10 hover:text-orange-400" aria-label="Сохранить" data-testid={`rcon-tag-save-${t.name}`}><Save size={15} /></button>
        <button onClick={del} className="h-10 px-3 border border-white/10 hover:text-red-400" aria-label="Удалить"><Trash2 size={15} /></button>
      </div>
    </div>
  );
};

export default function AdminConsole() {
  const { can } = useAuth();
  const [tags, setTags] = useState([]);
  const [groups, setGroups] = useState([]);
  const [grants, setGrants] = useState([]);
  const [servers, setServers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [nt, setNt] = useState({ name: "", title: "", patterns: "" });
  const load = useCallback(() => {
    api.get("/admin/rcon-tags").then((r) => setTags(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    api.get("/admin/console-groups").then((r) => setGroups(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    api.get("/servers").then((r) => setServers(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    if (can("console.manage")) {
      api.get("/admin/console-grants").then((r) => setGrants(Array.isArray(r.data) ? r.data : [])).catch(() => {});
      api.get("/admin/console/logs").then((r) => setLogs(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    }
  }, [can]);
  useEffect(() => { load(); }, [load]);
  const create = async (e) => {
    e.preventDefault();
    try { await api.post("/admin/rcon-tags", { ...nt, patterns: nt.patterns.split(",").map((s) => s.trim()).filter(Boolean) }); setNt({ name: "", title: "", patterns: "" }); load(); toast.success("Тег создан"); } catch (err) { toast.error(errorText(err)); }
  };
  return (
    <div className="space-y-4" data-testid="admin-console-page">
      <PageHeader kicker="RCON" title="Консоль и доступы" />
      <Panel title="Веб-консоль"><Console /></Panel>
      {can("console.manage") && (
        <>
          <Panel title="Группы консоли" testId="console-groups-panel"><ConsoleGroups groups={groups} tags={tags} servers={servers} onChange={load} /></Panel>
          <Panel title="Доступы игроков" testId="console-grants-panel"><ConsoleGrants grants={grants} groups={groups} onChange={load} /></Panel>
          <Panel title="Наборы команд (теги)" testId="rcon-tags-panel">
            <div className="space-y-2">{tags.map((t) => <TagRow key={`${t.name}-${t.patterns.join()}`} t={t} onSaved={load} />)}</div>
            <form onSubmit={create} className="grid sm:grid-cols-[140px_160px_1fr_auto] gap-2 mt-5 pt-5 border-t border-white/10">
              <Input required placeholder="ключ" pattern="[a-z0-9_]{2,24}" value={nt.name} onChange={(e) => setNt({ ...nt, name: e.target.value.toLowerCase() })} className={fieldCls} data-testid="new-tag-name" />
              <Input required placeholder="Название" value={nt.title} onChange={(e) => setNt({ ...nt, title: e.target.value })} className={fieldCls} data-testid="new-tag-title" />
              <Input placeholder="команды через запятую: kick, ban, gamemode*" value={nt.patterns} onChange={(e) => setNt({ ...nt, patterns: e.target.value })} className={`${fieldCls} font-mono text-xs`} data-testid="new-tag-patterns" />
              <button type="submit" className="btn-primary h-11 px-4 flex items-center gap-2 text-sm" data-testid="new-tag-submit"><Plus size={15} />Тег</button>
            </form>
          </Panel>
          <Panel title="Журнал команд" testId="console-logs">
            {logs.length === 0 && <p className="text-sm text-zinc-400">Команд ещё не было.</p>}
            <div className="space-y-2 font-mono text-xs">
              {logs.map((l) => (
                <div key={l.id} className="flex flex-wrap gap-x-3 border-b border-white/5 pb-2">
                  <span className="text-zinc-400">{fmtDate(l.created_at, true)}</span><span className="text-orange-400">{l.username}</span><span>@{l.server_name}</span>
                  <span className="text-white">/{l.command}</span><span className="text-zinc-400">[{l.tag}]</span><span className={l.ok ? "text-emerald-400" : "text-red-400"}>{l.ok ? "OK" : l.response}</span>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
