import { useEffect, useRef, useState } from "react";
import { animate, useInView, motion, useScroll, useTransform } from "framer-motion";
import { Reveal, SectionLabel } from "./Reveal";

const Counter = ({ to, suffix = "" }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return undefined;
    const c = animate(0, to, { duration: 2, ease: [0.16, 1, 0.3, 1], onUpdate: (x) => setV(Math.round(x)) });
    return () => c.stop();
  }, [inView, to]);
  return <span ref={ref}>{v.toLocaleString("ru-RU")}{suffix}</span>;
};

const NUMBERS = [
  { to: 5, s: "", l: "игровых режимов в сети" },
  { to: 120, s: "+", l: "плагинов и систем" },
  { to: 120, s: "K", l: "участников в Discord" },
];

export const Overview = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);
  return (
    <section id="about" ref={ref} className="relative py-24 lg:py-40" data-testid="overview-section">
      <div className="max-w-[1400px] mx-auto px-5 lg:px-10 grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        <div className="lg:col-span-7">
          <Reveal><SectionLabel index="01">О проекте</SectionLabel></Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-display uppercase text-3xl sm:text-4xl lg:text-6xl leading-[0.95] mt-8">
              Не сервер. <span className="text-gradient">Целая сеть</span> миров за одним IP.
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-8 text-base sm:text-lg text-zinc-300 leading-relaxed max-w-2xl">
              Заходи на play.yanarpg.ru — из лобби порталы ведут на Survival, SkyBlock, BedWars и Anarchy. Единый аккаунт, рейтинг
              и привилегии работают на всех режимах. Честная экономика, ивенты каждую неделю и администрация, которая слышит игроков.
            </p>
          </Reveal>
          <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-8">
            {NUMBERS.map((n, i) => (
              <Reveal key={n.l} delay={0.1 * i}>
                <div className="border-l-2 border-[#FF6B00] pl-5" data-testid={`overview-stat-${i}`}>
                  <div className="font-display text-4xl lg:text-5xl"><Counter to={n.to} suffix={n.s} /></div>
                  <div className="text-sm text-zinc-400 mt-2">{n.l}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
        <Reveal className="lg:col-span-5" delay={0.15}>
          <div className="relative">
            <div className="absolute -inset-10 bg-[radial-gradient(circle_at_50%_30%,rgba(255,107,0,0.35),transparent_60%)] blur-2xl" />
            <div className="relative clip-frame-alt overflow-hidden aspect-[4/5]">
              <motion.img style={{ y: imgY, scale: 1.18 }} src="/img/mc_nether.jpg" alt="Мир YanaRPG" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 font-mono text-xs uppercase tracking-widest text-zinc-200">
                Кадр из игры · Данж Незера, сезон 5
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};
