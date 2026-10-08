const ITEMS = ["Survival", "SkyBlock", "BedWars", "Anarchy", "Кланы и войны", "Автодонат", "Еженедельные ивенты", "Один IP"];

export const Marquee = () => {
  const row = [...ITEMS, ...ITEMS];
  return (
    <div className="relative border-y border-white/10 bg-[#0d0d10] py-6 overflow-hidden" data-testid="marquee">
      <div className="marquee-track flex w-max">
        {[0, 1].map((k) => (
          <div key={k} className="flex shrink-0" aria-hidden={k === 1}>
            {row.map((t, i) => (
              <span key={i} className="flex items-center font-display uppercase text-2xl sm:text-4xl whitespace-nowrap">
                <span className={i % 2 ? "text-outline" : "text-white"}>{t}</span>
                <span className="mx-8 w-3 h-3 rotate-45 bg-[#FF6B00] shadow-[0_0_20px_#FF6B00]" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
