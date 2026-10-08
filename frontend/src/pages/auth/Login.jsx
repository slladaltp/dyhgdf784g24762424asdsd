import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { errorText } from "@/lib/api";
import { fieldCls } from "@/components/panel/ui";
import { AuthShell } from "./AuthShell";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const u = await login(form.email, form.password);
      toast.success(`С возвращением, ${u.username}!`);
      navigate(location.state?.from || "/dashboard", { replace: true });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell kicker="Вход" title="Войти в аккаунт"
      footer={<>Нет аккаунта? <Link to="/register" className="text-orange-400 hover:underline" data-testid="login-to-register">Зарегистрироваться</Link></>}>
      <form onSubmit={submit} className="space-y-5" data-testid="login-form">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required autoComplete="email" value={form.email} className={fieldCls}
            onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="login-email-input" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Пароль</Label>
            <Link to="/forgot-password" className="text-xs text-orange-400 hover:underline" data-testid="login-forgot-link">Забыли пароль?</Link>
          </div>
          <Input id="password" type="password" required autoComplete="current-password" value={form.password} className={fieldCls}
            onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="login-password-input" />
        </div>
        {error && <p className="text-sm text-red-400 border border-red-500/30 bg-red-500/10 px-3 py-2" data-testid="login-error">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full h-12 flex items-center justify-center gap-2 disabled:opacity-60" data-testid="login-submit-btn">
          {loading && <Loader2 size={18} className="animate-spin" />} Войти
        </button>
      </form>
    </AuthShell>
  );
}
