import { Reveal, SectionLabel } from "./Reveal";

const STEPS = [
  { n: "01", t: "Запусти Minecraft", d: "Java Edition 1.20+, лицензия или любой лаунчер." },
  { n: "02", t: "Добавь сервер", d: "Сетевая игра → Добавить → play.yanarpg.ru" },
  { n: "03", t: "Выбери портал", d: "Из лобби пройди в портал нужного режима." },
];

export const Steps = () => (
  <section id="start" className="relative py-24 lg:py-32 bg-[#0c0c0f] overflow-hidden" data-testid="steps-section">
    <div className="max-w-[1400px] mx-auto px-5 lg:px-10">
      <Reveal><SectionLabel index="04">Как начать</SectionLabel></Reveal>
      <Reveal delay={0.1}><h2 className="font-display uppercase text-3xl sm:text-4xl lg:text-6xl mt-6 mb-16 leading-[0.95]">Три шага до улиц</h2></Reveal>
      <div className="grid md:grid-cols-3 border-t border-white/10">
        {STEPS.map((s, i) => (
          <Reveal key={s.n} delay={0.12 * i}>
            <div className="group relative py-10 md:px-8 md:first:pl-0 border-b md:border-b-0 md:border-r border-white/10 last:border-r-0 h-full" data-testid={`step-${s.n}`}>
              <div className="absolute top-0 left-0 h-[2px] w-0 bg-[#FF6B00] transition-all duration-700 group-hover:w-full" />
              <div className="font-display text-7xl lg:text-8xl text-outline group-hover:text-[#FF6B00] transition-colors duration-500">{s.n}</div>
              <h3 className="font-display uppercase text-xl sm:text-2xl mt-6">{s.t}</h3>
              <p className="text-zinc-300 mt-3 max-w-xs">{s.d}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);
