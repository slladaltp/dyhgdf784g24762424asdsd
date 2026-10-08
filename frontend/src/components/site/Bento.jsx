import { motion } from "framer-motion";
import { Pickaxe, Swords, Cloud, Flame, Zap, Users } from "lucide-react";
import { Reveal, SectionLabel } from "./Reveal";

const ITEMS = [
  { id: "cars", icon: Pickaxe, title: "Survival", text: "Выживание с экономикой, приватами, аукционом и городами игроков.", img: "/img/mc_build.jpg", span: "md:col-span-2 md:row-span-2" },
  { id: "crime", icon: Swords, title: "BedWars", text: "Командные битвы, рейтинг и турниры.", img: "/img/mc_pvp.jpg", span: "md:row-span-2" },
  { id: "gov", icon: Cloud, title: "SkyBlock", text: "Свой остров и прокачка.", img: "/img/mc_hero.jpg", span: "" },
  { id: "biz", icon: Flame, title: "Anarchy", text: "Без правил и привата.", img: "/img/mc_nether.jpg", span: "" },
  { id: "launcher", icon: Zap, title: "Автодонат", text: "Привилегии, кейсы и наборы приходят в игру за секунды после оплаты.", span: "md:col-span-2", accent: true },
  { id: "voice", icon: Users, title: "Кланы", text: "Создавай клан, захватывай территории и поднимайся в рейтинге.", span: "md:col-span-2" },
];

const Card = ({ item }) => {
  const Icon = item.icon;
  return (
    <motion.article whileHover={{ y: -6 }} transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className={`bento-card group relative overflow-hidden border border-white/10 min-h-[240px] h-full ${item.accent ? "bg-[#FF6B00] text-black" : "bg-[#121215]"}`}
      data-testid={`bento-${item.id}`}>
      {item.img && (
        <>
          <img src={item.img} alt={item.title} className="absolute inset-0 w-full h-full object-cover opacity-60 transition-transform duration-[1.4s] ease-out group-hover:scale-110" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        </>
      )}
      <div className="relative h-full p-6 lg:p-8 flex flex-col justify-between gap-8">
        <div className={`w-12 h-12 flex items-center justify-center border ${item.accent ? "border-black/30" : "border-orange-500/40 bg-black/40 text-orange-400"}`}>
          <Icon size={22} />
        </div>
        <div>
          <h3 className="font-display uppercase text-xl sm:text-2xl">{item.title}</h3>
          <p className={`mt-2 text-sm sm:text-base max-w-md ${item.accent ? "text-black/80" : "text-zinc-300"}`}>{item.text}</p>
        </div>
      </div>
    </motion.article>
  );
};

export const Bento = () => (
  <section id="features" className="py-24 lg:py-32 bg-[#0c0c0f]" data-testid="features-section">
    <div className="max-w-[1400px] mx-auto px-5 lg:px-10">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-14">
        <div>
          <Reveal><SectionLabel index="02">Возможности</SectionLabel></Reveal>
          <Reveal delay={0.1}><h2 className="font-display uppercase text-3xl sm:text-4xl lg:text-6xl mt-6 leading-[0.95]">Выбери свой режим</h2></Reveal>
        </div>
        <Reveal delay={0.2}><p className="text-zinc-300 max-w-md">Выживание, мини-игры, анархия. Мир строят сами игроки.</p></Reveal>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 md:auto-rows-[260px] gap-4">
        {ITEMS.map((it, i) => (
          <Reveal key={it.id} delay={0.06 * i} className={it.span}><Card item={it} /></Reveal>
        ))}
      </div>
    </div>
  </section>
);
