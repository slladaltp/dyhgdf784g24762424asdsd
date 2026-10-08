import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { api, mediaUrl } from "@/lib/api";
import { Reveal, SectionLabel } from "./Reveal";

const FALLBACK = [
  { id: 1, tag: "Обновление", date: "", title: "Сезон 5: новые биомы и данж Незера", text: "Новые биомы, боссы и легендарный лут в глубинах Незера.", img: "/img/mc_nether.jpg" },
  { id: 2, tag: "Ивент", date: "", title: "Летний ивент: двойной опыт на SkyBlock", img: "/img/mc_hero.jpg" },
  { id: 3, tag: "Турнир", date: "", title: "Турнир BedWars с призовым фондом", img: "/img/mc_pvp.jpg" },
  { id: 4, tag: "Конкурс", date: "", title: "Конкурс построек: город мечты", img: "/img/mc_build.jpg" },
  { id: 5, tag: "Магазин", date: "", title: "Новые кейсы и легендарные предметы", img: "/img/mc_case.jpg" },
  { id: 6, tag: "Сообщество", date: "", title: "Открыт набор в команду модераторов", img: "/img/mc_hero_char.jpg" },
];

const openNews = () => toast("Полная статья скоро", { description: "Раздел новостей в разработке." });

const toCard = (n, i) => ({
  id: i + 1, slug: n.slug, tag: n.tag, title: n.title, text: n.excerpt, img: mediaUrl(n.cover_url) || "/img/mc_hero.jpg",
  date: n.published_at ? new Date(n.published_at).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" }) : "",
});

const useNews = () => {
  const [items, setItems] = useState(FALLBACK);
  useEffect(() => {
    let alive = true;
    api.get("/news", { params: { limit: 6 } })
      .then((r) => { if (alive && Array.isArray(r.data)) setItems(r.data.map(toCard)); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return items;
};

const NewsCard = ({ n, big, onOpen }) => (
  <button onClick={onOpen} data-testid={`news-card-${n.id}`}
    className="group relative block w-full h-full text-left overflow-hidden border border-white/10 bg-[#121215] min-h-[300px]">
    <img src={n.img} alt={n.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1.4s] ease-out group-hover:scale-105" />
    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/10" />
    <div className="absolute inset-0 border-2 border-transparent group-hover:border-[#FF6B00] transition-colors duration-500" />
    <div className="relative h-full p-6 lg:p-8 flex flex-col justify-between gap-10">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-widest bg-[#FF6B00] text-black px-2 py-1">{n.tag}</span>
        <span className="w-10 h-10 flex items-center justify-center bg-white/10 backdrop-blur-md group-hover:bg-[#FF6B00] group-hover:text-black group-hover:rotate-45 transition-all duration-500">
          <ArrowUpRight size={18} />
        </span>
      </div>
      <div>
        <div className="font-mono text-xs text-zinc-300 uppercase tracking-widest">{n.date}</div>
        <h3 className={`font-display uppercase mt-3 leading-tight ${big ? "text-2xl sm:text-3xl lg:text-4xl" : "text-lg sm:text-xl"}`}>{n.title}</h3>
        {big && n.text && <p className="mt-4 text-zinc-300 max-w-lg">{n.text}</p>}
      </div>
    </div>
  </button>
);

export const News = () => {
  const items = useNews();
  const navigate = useNavigate();
  const open = (n) => (n.slug ? navigate(`/news/${n.slug}`) : openNews());
  return (
  <section id="news" className="py-24 lg:py-32" data-testid="news-section">
    <div className="max-w-[1400px] mx-auto px-5 lg:px-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-14">
        <div>
          <Reveal><SectionLabel index="05">Новости</SectionLabel></Reveal>
          <Reveal delay={0.1}><h2 className="font-display uppercase text-3xl sm:text-4xl lg:text-6xl mt-6 leading-[0.95]">Хроника мира</h2></Reveal>
        </div>
        <Reveal delay={0.2}>
          <button onClick={() => (items[0]?.slug ? navigate(`/news/${items[0].slug}`) : openNews())} data-testid="news-all-btn" className="nav-link font-mono text-sm uppercase tracking-widest text-orange-400">Все новости →</button>
        </Reveal>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 lg:auto-rows-[300px] gap-4">
        {items.length === 0 && <p className="text-zinc-400" data-testid="news-empty">Новостей пока нет.</p>}
        {items.map((n, i) => (
          <Reveal key={n.slug || n.id} delay={0.06 * i} className={i === 0 ? "md:col-span-2 lg:row-span-2" : ""}>
            <NewsCard n={n} big={i === 0} onOpen={() => open(n)} />
          </Reveal>
        ))}
      </div>
    </div>
  </section>
  );
};
