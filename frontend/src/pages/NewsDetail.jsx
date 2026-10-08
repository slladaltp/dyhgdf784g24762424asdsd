import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { api, fmtDate, mediaUrl } from "@/lib/api";
import { Logo } from "@/components/site/Logo";
import { Footer } from "@/components/site/Footer";
import { FullLoader } from "@/components/auth/Guards";

const EASE = [0.16, 1, 0.3, 1];

export default function NewsDetail() {
  const { slug } = useParams();
  const [item, setItem] = useState(null);
  const [more, setMore] = useState([]);

  useEffect(() => {
    let alive = true;
    window.scrollTo(0, 0);
    setItem(null);
    api.get(`/news/${slug}`).then((r) => alive && setItem(r.data)).catch(() => alive && setItem(false));
    api.get("/news", { params: { limit: 4 } })
      .then((r) => alive && setMore((Array.isArray(r.data) ? r.data : []).filter((n) => n.slug !== slug).slice(0, 3)))
      .catch(() => {});
    return () => { alive = false; };
  }, [slug]);

  if (item === null) return <FullLoader />;

  return (
    <div className="bg-[#09090B] min-h-screen grain overflow-x-clip" data-testid="news-detail-page">
      <header className="fixed top-0 inset-x-0 z-50 bg-black/70 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-[1400px] mx-auto px-5 lg:px-10 h-16 flex items-center justify-between">
          <Logo testId="news-detail-logo" />
          <Link to="/#news" data-testid="news-detail-back" className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white">
            <ArrowLeft size={16} /> Все новости
          </Link>
        </div>
      </header>
      {item === false ? (
        <div className="pt-40 pb-32 text-center px-5">
          <h1 className="font-display uppercase text-3xl" data-testid="news-not-found">Новость не найдена</h1>
          <Link to="/" className="btn-primary inline-flex mt-8 h-12 px-8 items-center">На главную</Link>
        </div>
      ) : (
        <>
          <section className="relative pt-16 min-h-[70vh] flex items-end overflow-hidden">
            <motion.img src={mediaUrl(item.cover_url)} alt={item.title} className="absolute inset-0 w-full h-full object-cover"
              initial={{ scale: 1.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1.6, ease: EASE }} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-[#09090B]/70 to-[#09090B]/20" />
            <div className="relative max-w-[1000px] mx-auto px-5 lg:px-10 pb-14 w-full">
              <div className="flex flex-wrap items-center gap-4 font-mono text-xs uppercase tracking-widest">
                <span className="bg-[#FF6B00] text-black px-2 py-1">{item.tag}</span>
                <span className="text-zinc-300">{fmtDate(item.published_at)}</span>
                {item.author_name && <span className="text-zinc-300">· {item.author_name}</span>}
              </div>
              <h1 className="font-display uppercase text-3xl sm:text-4xl lg:text-6xl leading-[0.95] mt-6" data-testid="news-detail-title">
                <span className="block overflow-hidden">
                  <motion.span className="block" initial={{ y: "100%" }} animate={{ y: 0 }} transition={{ duration: 1.1, delay: 0.3, ease: EASE }}>{item.title}</motion.span>
                </span>
              </h1>
            </div>
          </section>
          <article className="max-w-[760px] mx-auto px-5 lg:px-10 py-16" data-testid="news-detail-content">
            {item.excerpt && <p className="text-lg sm:text-xl text-white leading-relaxed border-l-2 border-[#FF6B00] pl-5 mb-10">{item.excerpt}</p>}
            {(item.content || "").split(/\n{2,}/).filter(Boolean).map((p, i) => (
              <p key={i} className="text-base sm:text-lg text-zinc-300 leading-relaxed mb-6 whitespace-pre-line">{p}</p>
            ))}
          </article>
          {more.length > 0 && (
            <section className="max-w-[1400px] mx-auto px-5 lg:px-10 pb-24">
              <h2 className="font-display uppercase text-xl sm:text-2xl mb-8">Читайте также</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {more.map((n) => (
                  <Link key={n.id} to={`/news/${n.slug}`} data-testid={`news-more-${n.slug}`}
                    className="group relative block aspect-[4/3] overflow-hidden border border-white/10">
                    <img src={mediaUrl(n.cover_url)} alt={n.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                    <div className="absolute bottom-5 left-5 right-5">
                      <div className="font-mono text-[11px] uppercase tracking-widest text-orange-400">{n.tag}</div>
                      <div className="font-display uppercase text-base mt-2 leading-tight">{n.title}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
      <Footer />
    </div>
  );
}
