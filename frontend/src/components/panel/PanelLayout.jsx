import { useState } from "react";
import { NavLink, Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Menu, X, ArrowLeftRight, Home, Search, Trophy } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/site/Logo";
import { UserAvatar, RoleBadge } from "./ui";
import { CommandPalette } from "./CommandPalette";

const NavItems = ({ items, onNavigate }) => {
  const { can } = useAuth();
  return (
    <nav className="flex flex-col gap-1">
      {items.filter((i) => !i.perm || can(i.perm)).map((i) => (
        <NavLink key={i.to} to={i.to} end={i.end} onClick={onNavigate} data-testid={`panel-nav-${i.id}`}
          className={({ isActive }) => `relative flex items-center gap-3 px-4 h-11 text-sm transition-colors ${isActive ? "text-white bg-white/[0.04]" : "text-zinc-400 hover:text-white hover:bg-white/[0.03]"}`}>
          {({ isActive }) => (
            <>
              {isActive && <motion.span layoutId="panel-active" className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#FF6B00]" />}
              <i.icon size={18} className={isActive ? "text-orange-400" : ""} />
              {i.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
};

const Sidebar = ({ items, section, onNavigate, onSearch }) => {
  const { user, logout, can } = useAuth();
  const navigate = useNavigate();
  const isAdmin = section === "admin";
  const doLogout = async () => {
    await logout();
    toast.success("Вы вышли из аккаунта");
    navigate("/");
  };
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 h-16 flex items-center border-b border-white/10"><Logo testId="panel-logo" /></div>
      <div className="px-5 pt-6 pb-3 font-mono text-[11px] uppercase tracking-[0.3em] text-orange-400">
        {isAdmin ? "Админ-панель" : "Личный кабинет"}
      </div>
      {isAdmin && (
        <div className="px-3 pb-3">
          <button onClick={() => { onNavigate?.(); onSearch(); }} data-testid="panel-search-btn"
            className="w-full h-10 px-3 flex items-center gap-2 text-sm text-zinc-400 border border-white/10 hover:border-orange-500/50 hover:text-white transition-colors">
            <Search size={15} />Поиск…<kbd className="ml-auto font-mono text-[10px] border border-white/15 px-1.5 py-0.5">Ctrl K</kbd>
          </button>
        </div>
      )}
      <div className="px-3 flex-1 overflow-y-auto"><NavItems items={items} onNavigate={onNavigate} /></div>
      <div className="p-3 border-t border-white/10 space-y-1">
        {can("admin.access") && (
          <Link to={isAdmin ? "/dashboard" : "/admin"} onClick={onNavigate} data-testid="panel-switch-section"
            className="flex items-center gap-3 px-4 h-11 text-sm text-zinc-300 hover:text-white hover:bg-white/[0.03]">
            <ArrowLeftRight size={18} /> {isAdmin ? "Личный кабинет" : "Админ-панель"}
          </Link>
        )}
        <Link to="/leaderboard" onClick={onNavigate} data-testid="panel-leaderboard-link" className="flex items-center gap-3 px-4 h-11 text-sm text-zinc-300 hover:text-white hover:bg-white/[0.03]">
          <Trophy size={18} /> Рейтинг игроков
        </Link>
        <Link to="/" onClick={onNavigate} data-testid="panel-home-link" className="flex items-center gap-3 px-4 h-11 text-sm text-zinc-300 hover:text-white hover:bg-white/[0.03]">
          <Home size={18} /> На сайт
        </Link>
        <div className="flex items-center gap-3 px-3 py-3 mt-2 bg-white/[0.03] border border-white/5">
          <UserAvatar user={user} size={38} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate" data-testid="panel-username">{user?.username}</div>
            <RoleBadge role={user?.role} />
          </div>
          <button onClick={doLogout} data-testid="panel-logout-btn" aria-label="Выйти"
            className="p-2 text-zinc-400 hover:text-red-400 transition-colors"><LogOut size={18} /></button>
        </div>
      </div>
    </div>
  );
};

export const PanelLayout = ({ items, section }) => {
  const [open, setOpen] = useState(false);
  const [cmd, setCmd] = useState(false);
  const location = useLocation();
  const openSearch = () => setCmd(true);
  return (
    <div className="min-h-screen bg-[#09090B] text-white" data-testid={`${section}-layout`}>
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-[260px] bg-[#0b0b0e] border-r border-white/10 z-40">
        <Sidebar items={items} section={section} onSearch={openSearch} />
      </aside>
      {section === "admin" && <CommandPalette open={cmd} setOpen={setCmd} />}
      <header className="lg:hidden sticky top-0 z-40 h-16 px-5 flex items-center justify-between bg-black/80 backdrop-blur-xl border-b border-white/10">
        <Logo testId="panel-mobile-logo" />
        <button onClick={() => setOpen(true)} data-testid="panel-mobile-menu-btn" aria-label="Меню" className="p-2"><Menu /></button>
      </header>
      <AnimatePresence>
        {open && (
          <>
            <motion.div className="lg:hidden fixed inset-0 bg-black/70 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="lg:hidden fixed inset-y-0 left-0 w-[85%] max-w-[300px] bg-[#0b0b0e] border-r border-white/10 z-50" data-testid="panel-mobile-drawer">
              <button onClick={() => setOpen(false)} className="absolute right-3 top-4 p-2 z-10" aria-label="Закрыть" data-testid="panel-mobile-close"><X /></button>
              <Sidebar items={items} section={section} onSearch={openSearch} onNavigate={() => setOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      <main className="lg:pl-[260px]">
        <motion.div key={location.pathname} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-[1280px] mx-auto px-5 lg:px-10 py-8 lg:py-12">
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
};
