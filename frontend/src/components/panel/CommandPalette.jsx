import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Gauge, Users, Newspaper, ShieldCheck, Server, ScrollText, Plus, Trophy, Home, UserRound } from "lucide-react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

const PAGES = [
  ["/admin", "Сводка", Gauge], ["/admin/users", "Пользователи", Users, "users.view"], ["/admin/news", "Новости", Newspaper],
  ["/admin/news/new", "Создать новость", Plus, "news.create"], ["/admin/servers", "Сервера", Server], ["/admin/audit", "Журнал действий", ScrollText, "audit.view"],
  ["/admin/roles", "Роли и права", ShieldCheck], ["/leaderboard", "Рейтинг игроков", Trophy], ["/", "Открыть сайт", Home],
];

export const CommandPalette = ({ open, setOpen }) => {
  const navigate = useNavigate();
  const { can } = useAuth();
  const [q, setQ] = useState("");
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  useEffect(() => {
    if (!can("users.view") || q.trim().length < 2) { setPlayers([]); return undefined; }
    const t = setTimeout(() => {
      api.get("/admin/users", { params: { q } }).then((r) => setPlayers((r.data?.items ?? []).slice(0, 6))).catch(() => {});
    }, 200);
    return () => clearTimeout(t);
  }, [q, can]);

  const go = (to) => { setOpen(false); setQ(""); navigate(to); };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Страница или ник игрока…" value={q} onValueChange={setQ} data-testid="command-input" />
      <CommandList data-testid="command-list">
        <CommandEmpty>Ничего не найдено.</CommandEmpty>
        {players.length > 0 && (
          <>
            <CommandGroup heading="Игроки">
              {players.map((p) => (
                <CommandItem key={p.id} value={`player ${p.username} ${p.email}`} onSelect={() => go(`/admin/users?open=${p.id}`)} data-testid={`command-player-${p.username}`}>
                  <UserRound className="mr-2 text-orange-400" />{p.username}<span className="ml-2 text-xs text-zinc-400">{p.email}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}
        <CommandGroup heading="Навигация">
          {PAGES.filter(([, , , p]) => !p || can(p)).map(([to, label, Icon]) => (
            <CommandItem key={to} value={label} onSelect={() => go(to)} data-testid={`command-go-${to.replaceAll("/", "-") || "home"}`}>
              <Icon className="mr-2 text-orange-400" />{label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
