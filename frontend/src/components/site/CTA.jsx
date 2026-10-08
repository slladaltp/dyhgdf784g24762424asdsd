import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Download } from "lucide-react";
import { soon } from "./Nav";
import { Reveal } from "./Reveal";

export const CTA = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-15%", "15%"]);
  return (
    <section ref={ref} className="relative overflow-hidden py-32 lg:py-48" data-testid="cta-section">
      <motion.img style={{ y, scale: 1.3 }} src="/img/mc_pvp.jpg" alt="Битва на арене" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-[#09090B]/75" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,107,0,0.25),transparent_65%)]" />
      <div className="relative max-w-[1400px] mx-auto px-5 lg:px-10 text-center">
        <Reveal>
          <h2 className="font-display uppercase text-[clamp(2.2rem,8vw,7rem)] leading-[0.9]">
            Твой мир<br /><span className="text-gradient">ждёт тебя</span>
          </h2>
        </Reveal>
        <Reveal delay={0.15}>
          <p className="mt-8 text-zinc-200 max-w-xl mx-auto">Заходи на play.yanarpg.ru, выбери режим и забери привилегию в магазине — выдача за секунды.</p>
        </Reveal>
        <Reveal delay={0.25}>
          <div className="mt-12 flex flex-wrap justify-center gap-4">
            <button onClick={soon} data-testid="cta-download-btn" className="btn-primary h-16 px-10 flex items-center gap-3 text-lg">
              <Download size={20} /> Скачать лаунчер
            </button>
            <button onClick={soon} data-testid="cta-discord-btn"
              className="h-16 px-8 border border-white/25 bg-black/40 backdrop-blur-md hover:border-orange-500 transition-colors">
              Наш Discord
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
};
