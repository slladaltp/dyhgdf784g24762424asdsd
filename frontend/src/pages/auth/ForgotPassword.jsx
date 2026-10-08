import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, MailCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, errorText } from "@/lib/api";
import { fieldCls } from "@/components/panel/ui";
import { AuthShell } from "./AuthShell";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell kicker="Восстановление" title="Забыли пароль?" image="/img/mc_pvp.jpg"
      footer={<>Вспомнили? <Link to="/login" className="text-orange-400 hover:underline" data-testid="forgot-to-login">Войти</Link></>}>
      {sent ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="border border-emerald-500/30 bg-emerald-500/10 p-6" data-testid="forgot-success">
          <MailCheck className="text-emerald-400" size={28} />
          <p className="mt-4 text-white">Если аккаунт с адресом <b>{email}</b> существует, мы отправили письмо со ссылкой для сброса пароля.</p>
          <p className="mt-2 text-sm text-zinc-300">Ссылка действует 1 час. Проверьте папку «Спам», если письма нет.</p>
        </motion.div>
      ) : (
        <form onSubmit={submit} className="space-y-5" data-testid="forgot-form">
          <p className="text-sm text-zinc-300">Укажите email аккаунта, и мы пришлём ссылку для создания нового пароля.</p>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required autoComplete="email" value={email} className={fieldCls}
              onChange={(e) => setEmail(e.target.value)} data-testid="forgot-email-input" />
          </div>
          {error && <p className="text-sm text-red-400 border border-red-500/30 bg-red-500/10 px-3 py-2" data-testid="forgot-error">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full h-12 flex items-center justify-center gap-2 disabled:opacity-60" data-testid="forgot-submit-btn">
            {loading && <Loader2 size={18} className="animate-spin" />} Отправить ссылку
          </button>
        </form>
      )}
    </AuthShell>
  );
}
