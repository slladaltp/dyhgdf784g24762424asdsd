import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Loader2, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { api, errorText } from "@/lib/api";
import { PageHeader, Panel, UserAvatar, fieldCls } from "@/components/panel/ui";

const ProfileForm = () => {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ username: user.username, city: user.city || "", bio: user.bio || "", mc_nick: user.mc_nick || "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.patch("/users/me", { ...form, mc_nick: form.mc_nick || undefined });
      setUser(data);
      toast.success("Профиль сохранён");
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/users/me/avatar", fd);
      setUser({ ...user, avatar_url: data.avatar_url });
      toast.success("Аватар обновлён");
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <Panel title="Аватар" testId="settings-avatar-panel">
        <div className="flex flex-col items-center text-center gap-5">
          <div className="relative group">
            <UserAvatar user={user} size={140} className="clip-frame" />
            <button onClick={() => fileRef.current?.click()} disabled={uploading} data-testid="settings-avatar-btn"
              className="absolute inset-0 clip-frame flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
              {uploading ? <Loader2 className="animate-spin" /> : <Camera />}
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={upload} data-testid="settings-avatar-input" />
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="h-10 px-5 text-sm border border-white/15 hover:border-orange-500/60" data-testid="settings-avatar-upload-btn">
            {uploading ? "Загрузка…" : "Загрузить фото"}
          </button>
          <p className="text-xs text-zinc-400">JPG, PNG, WEBP или GIF до 5 МБ</p>
        </div>
      </Panel>
      <Panel title="Публичный профиль" className="lg:col-span-2" testId="settings-profile-panel">
        <form onSubmit={save} className="space-y-5" data-testid="settings-profile-form">
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="username">Никнейм</Label>
              <Input id="username" value={form.username} className={fieldCls} onChange={(e) => setForm({ ...form, username: e.target.value })} data-testid="settings-username-input" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Ник в Minecraft</Label>
              <Input id="city" value={form.mc_nick} maxLength={16} className={fieldCls} onChange={(e) => setForm({ ...form, mc_nick: e.target.value })} data-testid="settings-mcnick-input" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">О себе</Label>
            <Textarea id="bio" rows={4} maxLength={300} value={form.bio} className={`${fieldCls} h-auto`} onChange={(e) => setForm({ ...form, bio: e.target.value })} data-testid="settings-bio-input" />
            <p className="text-xs text-zinc-400 text-right">{form.bio.length}/300</p>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-zinc-400">Email: {user.email}</span>
            <button type="submit" disabled={saving} className="btn-primary h-11 px-6 text-sm flex items-center gap-2 disabled:opacity-60" data-testid="settings-profile-save-btn">
              {saving && <Loader2 size={16} className="animate-spin" />}Сохранить
            </button>
          </div>
        </form>
      </Panel>
    </div>
  );
};

const SecurityForm = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.new_password !== form.confirm) return setError("Новые пароли не совпадают");
    setSaving(true);
    try {
      await api.post("/users/me/password", { current_password: form.current_password, new_password: form.new_password });
      setForm({ current_password: "", new_password: "", confirm: "" });
      toast.success("Пароль изменён", { description: "Остальные сессии завершены." });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const doLogout = async () => {
    await logout();
    toast.success("Вы вышли из аккаунта");
    navigate("/");
  };

  const fields = [["current_password", "Текущий пароль", "current-password"], ["new_password", "Новый пароль", "new-password"], ["confirm", "Повторите новый пароль", "new-password"]];
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <Panel title="Смена пароля" className="lg:col-span-2" testId="settings-password-panel">
        <form onSubmit={submit} className="space-y-5 max-w-lg" data-testid="settings-password-form">
          {fields.map(([k, label, ac]) => (
            <div key={k} className="space-y-2">
              <Label htmlFor={k}>{label}</Label>
              <Input id={k} type="password" required autoComplete={ac} minLength={k === "current_password" ? undefined : 8} value={form[k]} className={fieldCls}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })} data-testid={`settings-${k}-input`} />
            </div>
          ))}
          {error && <p className="text-sm text-red-400 border border-red-500/30 bg-red-500/10 px-3 py-2" data-testid="settings-password-error">{error}</p>}
          <button type="submit" disabled={saving} className="btn-primary h-11 px-6 text-sm flex items-center gap-2 disabled:opacity-60" data-testid="settings-password-save-btn">
            {saving && <Loader2 size={16} className="animate-spin" />}Изменить пароль
          </button>
        </form>
      </Panel>
      <Panel title="Сессия" testId="settings-session-panel">
        <p className="text-sm text-zinc-300">Выход завершит текущую сессию на этом устройстве.</p>
        <button onClick={doLogout} className="mt-5 w-full h-11 flex items-center justify-center gap-2 border border-red-500/50 text-red-300 hover:bg-red-500 hover:text-white transition-colors text-sm" data-testid="settings-logout-btn">
          <LogOut size={16} /> Выйти из аккаунта
        </button>
      </Panel>
    </div>
  );
};

export default function Settings() {
  return (
    <div data-testid="settings-page">
      <PageHeader kicker="Аккаунт" title="Настройки" />
      <Tabs defaultValue="profile">
        <TabsList className="rounded-none bg-[#121215] border border-white/10 h-12 p-1 mb-6">
          <TabsTrigger value="profile" className="rounded-none h-full px-5 gap-2 data-[state=active]:bg-[#FF6B00] data-[state=active]:text-black" data-testid="settings-tab-profile"><UserRound size={15} />Профиль</TabsTrigger>
          <TabsTrigger value="security" className="rounded-none h-full px-5 gap-2 data-[state=active]:bg-[#FF6B00] data-[state=active]:text-black" data-testid="settings-tab-security"><ShieldCheck size={15} />Безопасность</TabsTrigger>
        </TabsList>
        <TabsContent value="profile"><ProfileForm /></TabsContent>
        <TabsContent value="security"><SecurityForm /></TabsContent>
      </Tabs>
    </div>
  );
}
