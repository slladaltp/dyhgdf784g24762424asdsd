import { useRef } from "react";
import { motion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import { Play, ArrowRight } from "lucide-react";
import { soon } from "./Nav";

const EASE = [0.16, 1, 0.3, 1];
const LINES = [
  { text: "СТРОЙ.", cls: "text-white" },
  { text: "СРАЖАЙСЯ.", cls: "text-gradient" },
  { text: "ПРАВЬ.", cls: "text-outline" },
];

const MaskLine = ({ text, cls, i }) => (
  <span className="block overflow-hidden pb-[0.06em] whitespace-nowrap">
    <motion.span className={`block ${cls}`} initial={{ y: "110%", rotate: 4 }} animate={{ y: "0%", rotate: 0 }}
      transition={{ duration: 1.2, delay: 0.5 + i * 0.14, ease: EASE }}>
      {text}
    </motion.span>
  </span>
);

const TiltCard = () => {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [10, -10]), { stiffness: 120, damping: 14 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-12, 12]), { stiffness: 120, damping: 14 });
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  return (
    <motion.div style={{ perspective: 1200 }} onMouseMove={onMove} onMouseLeave={() => { mx.set(0); my.set(0); }}
      initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1.4, delay: 0.9, ease: EASE }}
      className="relative w-full max-w-[380px] mx-auto" data-testid="hero-character-card">
      <motion.div style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }} className="relative aspect-[3/4]">
        <div className="absolute inset-0 clip-frame overflow-hidden border border-orange-500/40">
          <img src="/img/mc_hero_char.jpg" alt="Воин YanaRPG" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        </div>
        <div style={{ transform: "translateZ(60px)" }} className="absolute -left-4 sm:-left-8 bottom-10 bg-black/80 backdrop-blur-xl border border-white/10 px-4 py-3">
          <div className="font-mono text-[11px] uppercase tracking-widest text-orange-400">Персонаж</div>
          <div className="font-display text-lg">Игрок «NetherKing»</div>
          <div className="text-xs text-zinc-300">LEGEND · Survival · Топ-1 PvP</div>
        </div>
        <div style={{ transform: "translateZ(90px)" }} className="absolute -right-3 top-8 bg-[#FF6B00] text-black font-display text-sm px-3 py-2 rotate-3">
          [LEGEND]
        </div>
      </motion.div>
    </motion.div>
  );
};

const STATS = [["1.20+", "версии Java"], ["5", "режимов"], ["1 IP", "для всех серверов"], ["24/7", "онлайн"]];

export const Hero = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);
  const bgScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const giantX = useTransform(scrollYProgress, [0, 1], ["0%", "-20%"]);

  return (
    <section ref={ref} id="top" className="relative min-h-[100svh] overflow-hidden pt-16" data-testid="hero-section">
      <motion.div style={{ y: bgY, scale: bgScale }} className="absolute inset-0">
        <motion.img src="/img/mc_hero.jpg" alt="Мир YanaRPG" className="w-full h-full object-cover"
          initial={{ scale: 1.25, filter: "brightness(0)" }} animate={{ scale: 1, filter: "brightness(1)" }}
          transition={{ duration: 2.2, ease: EASE }} />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-r from-[#09090B] via-[#09090B]/75 to-[#09090B]/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-transparent to-[#09090B]/40" />
      <div className="scanlines absolute inset-0 pointer-events-none" />

      <motion.div style={{ x: giantX }} aria-hidden="true"
        className="absolute -bottom-[0.18em] left-0 font-display text-[28vw] leading-none text-outline-faint whitespace-nowrap pointer-events-none select-none">
        YANA RPG YANA
      </motion.div>

      <div className="relative max-w-[1400px] mx-auto px-5 lg:px-10 pt-14 lg:pt-20 pb-16 grid lg:grid-cols-[1.6fr_1fr] gap-12 items-center">
        <div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8 }}
            className="inline-flex items-center gap-3 border border-orange-500/30 bg-orange-500/10 px-4 py-2 font-mono text-xs uppercase tracking-widest text-orange-300"
            data-testid="hero-status-pill">
            <span className="live-dot" /> play.yanarpg.ru · Survival, SkyBlock, BedWars
          </motion.div>
          <h1 className="font-display uppercase leading-[0.9] tracking-tight mt-8 relative z-10 text-[clamp(2.2rem,10vw,6.5rem)]" data-testid="hero-title">
            {LINES.map((l, i) => <MaskLine key={l.text} {...l} i={i} />)}
          </h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3, duration: 1 }}
            className="mt-8 max-w-xl text-base sm:text-lg text-zinc-300 leading-relaxed">
            YanaRPG — сеть Minecraft-серверов на BungeeCord: один IP, порталы в лобби и десятки систем — от экономики до клановых войн.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5, duration: 0.9, ease: EASE }}
            className="mt-10 flex flex-wrap gap-4">
            <button onClick={soon} data-testid="hero-play-btn" className="btn-primary group h-14 px-8 flex items-center gap-3 text-base">
              Начать играть <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </button>
            <button onClick={soon} data-testid="hero-trailer-btn"
              className="h-14 px-6 flex items-center gap-3 border border-white/20 bg-white/5 backdrop-blur-md hover:border-orange-500/60 hover:bg-orange-500/10 transition-colors">
              <span className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center"><Play size={14} fill="currentColor" /></span>
              Смотреть трейлер
            </button>
          </motion.div>
        </div>
        <TiltCard />
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8, duration: 1 }}
        className="relative max-w-[1400px] mx-auto px-5 lg:px-10 pb-12 grid grid-cols-2 md:grid-cols-4 gap-px" data-testid="hero-stats">
        {STATS.map(([v, l]) => (
          <div key={l} className="border-t border-white/15 pt-4">
            <div className="font-display text-2xl sm:text-3xl">{v}</div>
            <div className="font-mono text-xs uppercase tracking-widest text-zinc-400 mt-1">{l}</div>
          </div>
        ))}
      </motion.div>
    </section>
  );
};
