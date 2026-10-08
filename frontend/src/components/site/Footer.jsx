import { Logo } from "./Logo";
import { NAV_LINKS, scrollTo, soon } from "./Nav";

const SOCIAL = ["Discord", "ВКонтакте", "Telegram", "YouTube"];

export const Footer = () => (
  <footer className="relative border-t border-white/10 bg-[#070709] pt-20 overflow-hidden" data-testid="site-footer">
    <div className="max-w-[1400px] mx-auto px-5 lg:px-10 grid gap-12 md:grid-cols-[1.5fr_1fr_1fr]">
      <div>
        <Logo testId="footer-logo" />
        <p className="mt-6 text-zinc-400 max-w-sm text-sm leading-relaxed">
          YanaRPG — сеть Minecraft-серверов. Все покупки — добровольное пожертвование на развитие проекта.
        </p>
      </div>
      <div>
        <div className="font-mono text-xs uppercase tracking-widest text-orange-400 mb-5">Навигация</div>
        <ul className="space-y-3">
          {NAV_LINKS.map((l) => (
            <li key={l.id}><button onClick={() => scrollTo(l.id)} data-testid={`footer-link-${l.id}`} className="nav-link text-zinc-300 hover:text-white">{l.label}</button></li>
          ))}
        </ul>
      </div>
      <div>
        <div className="font-mono text-xs uppercase tracking-widest text-orange-400 mb-5">Сообщество</div>
        <ul className="space-y-3">
          {SOCIAL.map((s) => (
            <li key={s}><button onClick={soon} data-testid={`footer-social-${s}`} className="nav-link text-zinc-300 hover:text-white">{s}</button></li>
          ))}
        </ul>
      </div>
    </div>
    <div className="max-w-[1400px] mx-auto px-5 lg:px-10 mt-16 py-6 border-t border-white/10 flex flex-col sm:flex-row justify-between gap-3 text-xs text-zinc-400">
      <span>© {new Date().getFullYear()} YanaRPG. Все права защищены.</span>
      <span>Не является официальным продуктом Minecraft. Не связан с Mojang и Microsoft.</span>
    </div>
    <div aria-hidden="true" className="font-display uppercase text-[22vw] leading-[0.8] text-center text-outline-faint select-none -mb-[0.12em]">YANARPG</div>
  </footer>
);
