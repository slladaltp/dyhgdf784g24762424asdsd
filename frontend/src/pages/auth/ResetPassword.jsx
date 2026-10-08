import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, errorText } from "@/lib/api";
import { fieldCls } from "@/components/panel/ui";
import { AuthShell } from "./AuthShell";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) return setError("Пароли не совпадают");
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: form.password });
      toast.success("Пароль обновлён", { description: "Войдите с новым паролем." });
      navigate("/login", { replace: true });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell kicker="Новый пароль" title="Сброс пароля" image="/img/mc_case.jpg"
      footer={<Link to="/forgot-password" className="text-orange-400 hover:underline" data-testid="reset-request-new">Запросить новую ссылку</Link>}>
      {!token ? (
        <p className="text-red-400 border border-red-500/30 bg-red-500/10 px-4 py-3" data-testid="reset-no-token">Ссылка неполная. Откройте её из письма ещё раз.</p>
      ) : (
        <form onSubmit={submit} className="space-y-5" data-testid="reset-form">
          {[["password", "Новый пароль"], ["confirm", "Повторите пароль"]].map(([k, l]) => (
            <div key={k} className="space-y-2">
              <Label htmlFor={k}>{l}</Label>
              <Input id={k} type="password" required minLength={8} autoComplete="new-password" value={form[k]} className={fieldCls}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })} data-testid={`reset-${k}-input`} />
            </div>
          ))}
          <p className="text-xs text-zinc-400">Минимум 8 символов. После смены все сессии будут завершены.</p>
          {error && <p className="text-sm text-red-400 border border-red-500/30 bg-red-500/10 px-3 py-2" data-testid="reset-error">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full h-12 flex items-center justify-center gap-2 disabled:opacity-60" data-testid="reset-submit-btn">
            {loading && <Loader2 size={18} className="animate-spin" />} Сохранить пароль
          </button>
        </form>
      )}
    </AuthShell>
  );
}
