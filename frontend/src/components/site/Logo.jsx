export const LogoMark = ({ className = "w-9 h-9" }) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
    <path d="M24 2 44 12v18L24 46 4 30V12Z" fill="#FF6B00" />
    <path d="M24 2 44 12v18L24 46Z" fill="#FFA500" opacity=".35" />
    <path d="M13 12h6.2L24 20.5 28.8 12H35l-8.4 13.6V36h-5.2V25.6Z" fill="#09090B" />
  </svg>
);

export const Logo = ({ testId = "logo" }) => (
  <a href="#top" data-testid={testId} className="flex items-center gap-3 group">
    <LogoMark className="w-9 h-9 transition-transform duration-500 group-hover:rotate-[18deg]" />
    <span className="font-display text-lg tracking-tight">
      YANA<span className="text-[#FF6B00]">RPG</span>
    </span>
  </a>
);
