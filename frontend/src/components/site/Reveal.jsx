import { motion } from "framer-motion";

export const Reveal = ({ children, delay = 0, y = 40, className = "" }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.15 }}
    transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
  >
    {children}
  </motion.div>
);

export const SectionLabel = ({ index, children }) => (
  <div className="flex items-center gap-4 font-mono text-xs uppercase tracking-[0.3em] text-orange-400">
    <span>{index}</span>
    <span className="h-px w-12 bg-orange-500/60" />
    <span className="text-zinc-300">{children}</span>
  </div>
);
