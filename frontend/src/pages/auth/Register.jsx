import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { errorText } from "@/lib/api";
import { fieldCls } from "@/components/panel/ui";
import { AuthShell } from "./AuthShell";

const FIELDS = [
  { k: "username", label: "Никнейм", type: "text", hint: "3–20 символов: латиница, цифры, _", ac: "username" },
  { k: "email", label: "Email", type: "email", ac: "email" },
  { k: "password", label: "Пароль", type: "password", hint: "Минимум 8 символов", ac: "new-password" },
  { k: "confirm", label: "Повторите пароль", type: "password", ac: "new-password" },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) return setError("Пароли не совпадают");
    setLoading(true);
    try {
      const { confirm, ...payload } = form;
      await register(payload);
      toast.success("Аккаунт создан. Добро пожаловать в YanaRPG!");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell kicker="Регистрация" title="Создать аккаунт" image="/img/mc_nether.jpg"
      footer={<>Уже есть аккаунт? <Link to="/login" className="text-orange-400 hover:underline" data-testid="register-to-login">Войти</Link></>}>
      <form onSubmit={submit} className="space-y-5" data-testid="register-form">
        {FIELDS.map((f) => (
          <div key={f.k} className="space-y-2">
            <Label htmlFor={f.k}>{f.label}</Label>
            <Input id={f.k} type={f.type} required autoComplete={f.ac} value={form[f.k]} className={fieldCls}
              onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} data-testid={`register-${f.k}-input`} />
            {f.hint && <p className="text-xs text-zinc-400">{f.hint}</p>}
          </div>
        ))}
        {error && <p className="text-sm text-red-400 border border-red-500/30 bg-red-500/10 px-3 py-2" data-testid="register-error">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full h-12 flex items-center justify-center gap-2 disabled:opacity-60" data-testid="register-submit-btn">
          {loading && <Loader2 size={18} className="animate-spin" />} Создать аккаунт
        </button>
      </form>
    </AuthShell>
  );
}
