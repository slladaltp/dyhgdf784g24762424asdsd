import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Download, LogIn } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { UserAvatar } from "@/components/panel/ui";
import { CurrencySwitcher } from "@/lib/currency";
import { Logo } from "./Logo";

export const NAV_LINKS = [
  { id: "about", label: "О сервере" },
  { id: "features", label: "Режимы" },
  { id: "servers", label: "Как зайти" },
  { id: "news", label: "Новости" },
];

export const scrollTo = (id) => {
  const el = document.getElementById(id);
  if (!el) { window.location.href = `/#${id}`; return; }
  if (window.__lenis) window.__lenis.scrollTo(el, { offset: -70 });
  else el.scrollIntoView({ behavior: "smooth" });
};

export const soon = () => toast("Скоро открытие", { description: "Лаунчер и регистрация появятся в ближайшее время." });

const AccountButton = ({ mobile = false }) => {
  const { user } = useAuth();
  if (user) {
    return (
      <Link to="/dashboard" data-testid={mobile ? "mobile-account-link" : "nav-account-link"}
        className={`flex items-center gap-2 border border-white/15 hover:border-orange-500/60 transition-colors ${mobile ? "h-12 justify-center" : "h-10 pl-1 pr-4"}`}>
        <UserAvatar user={user} size={mobile ? 32 : 32} />
        <span className="text-sm">{mobile ? "Личный кабинет" : user.username}</span>
      </Link>
    );
  }
  return (
    <Link to="/login" data-testid={mobile ? "mobile-login-link" : "nav-login-link"}
      className={`flex items-center gap-2 border border-white/15 hover:border-orange-500/60 transition-colors text-sm ${mobile ? "h-12 justify-center" : "h-10 px-4"}`}>
      <LogIn size={16} /> Войти
    </Link>
  );
};

export const Nav = () => {
  const [open, setOpen] = useState(false);
  const go = (id) => { setOpen(false); scrollTo(id); };
  return (
    <motion.header
      initial={{ y: -80 }} animate={{ y: 0 }} transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 inset-x-0 z-50 bg-black/70 backdrop-blur-xl border-b border-white/10"
      data-testid="site-nav"
    >
      <div className="max-w-[1400px] mx-auto px-5 lg:px-10 h-16 flex items-center justify-between">
        <Logo testId="nav-logo" />
        <nav className="hidden lg:flex items-center gap-8">
          {NAV_LINKS.map((l) => (
            <button key={l.id} onClick={() => go(l.id)} data-testid={`nav-link-${l.id}`}
              className="nav-link text-sm text-zinc-300 hover:text-white transition-colors">{l.label}</button>
          ))}
          <Link to="/shop" data-testid="nav-link-shop" className="nav-link text-sm text-orange-300 hover:text-white transition-colors">Магазин</Link>
          <Link to="/leaderboard" data-testid="nav-link-leaderboard" className="nav-link text-sm text-orange-300 hover:text-white transition-colors">Рейтинг</Link>
        </nav>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 font-mono text-xs text-zinc-300" data-testid="nav-online-counter">
            <span className="live-dot" /> 4 890 онлайн
          </div>
          <div className="hidden 2xl:block"><CurrencySwitcher testId="nav-currency" /></div>
          <div className="hidden sm:block"><AccountButton /></div>
          <Link to="/shop" data-testid="nav-download-btn"
            className="hidden xl:flex btn-primary items-center gap-2 px-5 h-10 text-sm">
            <Download size={16} /> Донат
          </Link>
          <button className="lg:hidden p-2 text-white" onClick={() => setOpen(!open)} data-testid="nav-mobile-toggle" aria-label="Меню">
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            className="lg:hidden overflow-hidden border-t border-white/10 bg-black/95" data-testid="nav-mobile-menu">
            <div className="px-5 py-6 flex flex-col gap-4">
              {NAV_LINKS.map((l) => (
                <button key={l.id} onClick={() => go(l.id)} data-testid={`mobile-nav-link-${l.id}`}
                  className="text-left font-display text-2xl uppercase">{l.label}</button>
              ))}
              <Link to="/shop" onClick={() => setOpen(false)} data-testid="mobile-nav-link-shop" className="font-display text-2xl uppercase text-orange-400">Магазин</Link>
              <CurrencySwitcher testId="mobile-currency" />
              <Link to="/leaderboard" onClick={() => setOpen(false)} data-testid="mobile-nav-link-leaderboard" className="font-display text-2xl uppercase text-orange-400">Рейтинг</Link>
              <AccountButton mobile />
              <button onClick={soon} data-testid="mobile-download-btn" className="btn-primary h-12">Скачать лаунчер</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};
