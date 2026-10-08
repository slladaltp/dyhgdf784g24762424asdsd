import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/site/Logo";

const EASE = [0.16, 1, 0.3, 1];

export const AuthShell = ({ kicker, title, children, footer, image = "/img/mc_hero_char.jpg" }) => (
  <div className="min-h-screen grid lg:grid-cols-2 bg-[#09090B] text-white grain">
    <div className="relative hidden lg:block overflow-hidden">
      <motion.img src={image} alt="YanaRPG" className="absolute inset-0 w-full h-full object-cover"
        initial={{ scale: 1.2, filter: "brightness(0)" }} animate={{ scale: 1, filter: "brightness(1)" }} transition={{ duration: 1.8, ease: EASE }} />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/30 to-[#09090B]" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-transparent to-transparent" />
      <div className="absolute bottom-12 left-12 right-12">
        <div className="font-display uppercase text-5xl xl:text-6xl leading-[0.9]">
          {["Город", "ждёт"].map((w, i) => (
            <span key={w} className="block overflow-hidden">
              <motion.span className={`block ${i ? "text-gradient" : ""}`} initial={{ y: "110%" }} animate={{ y: 0 }}
                transition={{ duration: 1.1, delay: 0.4 + i * 0.12, ease: EASE }}>{w}</motion.span>
            </span>
          ))}
        </div>
        <p className="mt-5 text-zinc-300 max-w-sm">Один аккаунт — доступ ко всем серверам, статистике персонажа и новостям проекта.</p>
      </div>
    </div>
    <div className="relative flex flex-col px-5 sm:px-10 lg:px-16 py-8">
      <div className="flex items-center justify-between">
        <Logo testId="auth-logo" />
        <Link to="/" data-testid="auth-back-home" className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white">
          <ArrowLeft size={16} /> На главную
        </Link>
      </div>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2, ease: EASE }}
        className="flex-1 flex flex-col justify-center w-full max-w-md mx-auto py-12">
        <div className="font-mono text-xs uppercase tracking-[0.3em] text-orange-400">{kicker}</div>
        <h1 className="font-display uppercase text-3xl sm:text-4xl mt-4 mb-10" data-testid="auth-title">{title}</h1>
        {children}
        <div className="mt-8 text-sm text-zinc-400">{footer}</div>
      </motion.div>
    </div>
  </div>
);
