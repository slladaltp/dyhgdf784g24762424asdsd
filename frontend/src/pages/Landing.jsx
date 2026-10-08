import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { Nav } from "@/components/site/Nav";
import { Hero } from "@/components/site/Hero";
import { Marquee } from "@/components/site/Marquee";
import { Overview } from "@/components/site/Overview";
import { Bento } from "@/components/site/Bento";
import { Servers } from "@/components/site/Servers";
import { Steps } from "@/components/site/Steps";
import { News } from "@/components/site/News";
import { CTA } from "@/components/site/CTA";
import { Footer } from "@/components/site/Footer";

export default function Landing() {
  useEffect(() => {
    const lenis = new Lenis({ duration: 1.2, smoothWheel: true });
    window.__lenis = lenis;
    let id;
    const raf = (t) => { lenis.raf(t); id = requestAnimationFrame(raf); };
    id = requestAnimationFrame(raf);
    const hash = window.location.hash.slice(1);
    const t = hash ? setTimeout(() => { const el = document.getElementById(hash); if (el) lenis.scrollTo(el, { offset: -70, immediate: true }); }, 400) : null;
    return () => { clearTimeout(t); cancelAnimationFrame(id); lenis.destroy(); window.__lenis = null; };
  }, []);

  return (
    <div className="grain overflow-x-clip" data-testid="landing-page">
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <Overview />
        <Bento />
        <Servers />
        <Steps />
        <News />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
