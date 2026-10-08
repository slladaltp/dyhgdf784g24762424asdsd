import { useEffect, useRef, useState } from "react";
import { Send, TerminalSquare } from "lucide-react";
import { api, errorText, fmtDate } from "@/lib/api";

const GroupChip = ({ g }) => (
  <div className="border p-3 min-w-0" style={{ borderColor: `${g.color}55` }} data-testid={`console-group-${g.name}`}>
    <div className="flex items-center justify-between gap-3">
      <span className="font-display uppercase text-xs" style={{ color: g.color }}>{g.title}</span>
      <span className="font-mono text-[11px] text-zinc-400" data-testid={`console-group-usage-${g.name}`}>
        {g.daily_limit ? `${g.used_today}/${g.daily_limit} сегодня` : "без лимита"}
      </span>
    </div>
    <div className="font-mono text-[11px] text-zinc-300 mt-2 break-words">{g.patterns.join(", ")}</div>
    <div className="font-mono text-[11px] text-zinc-400 mt-1">
      {g.patterns.length} {g.patterns[0] === "*" ? "· все команды" : "команд"} · {g.expires_at ? `до ${fmtDate(g.expires_at)}` : "бессрочно"}
    </div>
  </div>
);

export const Console = () => {
  const [me, setMe] = useState(null);
  const [server, setServer] = useState("");
  const [cmd, setCmd] = useState("");
  const [lines, setLines] = useState([]);
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  const load = () => api.get("/console/me")
    .then((r) => { setMe({ groups: r.data?.groups ?? [], servers: r.data?.servers ?? [] }); setServer((s) => s || r.data?.servers?.[0]?.id || ""); })
    .catch(() => setMe({ groups: [], servers: [] }));
  useEffect(() => { load(); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest" }); }, [lines]);

  const run = async (e) => {
    e.preventDefault();
    if (!cmd.trim()) return;
    const c = cmd.trim();
    setCmd("");
    setBusy(true);
    setLines((l) => [...l, { t: "in", text: `> ${c}` }]);
    try {
      const { data } = await api.post("/console/exec", { server_id: server, command: c });
      const left = data.left_today != null ? ` · осталось ${data.left_today}` : "";
      setLines((l) => [...l, { t: data.ok ? "ok" : "err", text: `[${data.group}${left}] ${data.response || "OK"}` }]);
      load();
    } catch (err) {
      setLines((l) => [...l, { t: "err", text: errorText(err) }]);
    } finally {
      setBusy(false);
    }
  };

  if (!me) return <p className="text-sm text-zinc-400">Загрузка…</p>;
  if (!me.groups.length) return <p className="text-sm text-zinc-300 border border-white/10 p-5" data-testid="console-no-access">У вас нет доступа к консоли. Его можно получить с товаром из категории «Консоли» в магазине.</p>;
  const available = me.groups.filter((g) => g.servers.some((s) => s.id === server));

  return (
    <div className="space-y-4" data-testid="console">
      <div className="grid sm:grid-cols-2 gap-2">{me.groups.map((g) => <GroupChip key={g.name} g={g} />)}</div>
      <div className="flex flex-wrap gap-2">
        {me.servers.map((s) => (
          <button key={s.id} onClick={() => setServer(s.id)} data-testid={`console-server-${s.name}`}
            className={`h-9 px-4 text-sm border ${server === s.id ? "bg-[#FF6B00] text-black border-[#FF6B00]" : "border-white/10 text-zinc-300"}`}>{s.name}</button>
        ))}
      </div>
      <div className="bg-black border border-white/10 font-mono text-sm">
        <div className="flex items-center gap-2 px-4 h-10 border-b border-white/10 text-zinc-400 min-w-0">
          <TerminalSquare size={15} className="text-orange-400 shrink-0" />
          <span className="truncate">RCON · {me.servers.find((s) => s.id === server)?.name || "—"} · {available.map((g) => g.title).join(", ") || "нет групп"}</span>
        </div>
        <div className="h-72 overflow-y-auto p-4 space-y-1" data-lenis-prevent data-testid="console-output">
          {lines.length === 0 && <div className="text-zinc-400">Введите команду, например: say Привет!</div>}
          {lines.map((l, i) => <div key={i} className={`whitespace-pre-wrap break-words ${l.t === "in" ? "text-orange-300" : l.t === "err" ? "text-red-400" : "text-emerald-300"}`}>{l.text}</div>)}
          <div ref={endRef} />
        </div>
        <form onSubmit={run} className="flex border-t border-white/10">
          <span className="px-4 flex items-center text-orange-400">/</span>
          <input value={cmd} onChange={(e) => setCmd(e.target.value)} disabled={!server || busy} placeholder="команда" className="flex-1 min-w-0 bg-transparent h-12 outline-none text-white" data-testid="console-input" />
          <button type="submit" disabled={!server || busy} className="px-5 bg-[#FF6B00] text-black disabled:opacity-50" aria-label="Выполнить" data-testid="console-send-btn"><Send size={16} /></button>
        </form>
      </div>
    </div>
  );
};
