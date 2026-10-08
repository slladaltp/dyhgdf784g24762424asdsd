import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/context/AuthContext";
import { api, errorText, mediaUrl } from "@/lib/api";
import { PageHeader, Panel, StatusBadge, fieldCls } from "@/components/panel/ui";

const PRESETS = ["/img/mc_hero.jpg", "/img/mc_build.jpg", "/img/mc_pvp.jpg", "/img/mc_nether.jpg", "/img/mc_case.jpg", "/img/mc_hero_char.jpg"];
const EMPTY = { title: "", tag: "Новости", excerpt: "", content: "", cover_url: "/img/mc_hero.jpg", featured: false };

const Preview = ({ form }) => (
  <div className="relative aspect-[4/5] overflow-hidden border border-white/10" data-testid="news-editor-preview">
    {form.cover_url && <img src={mediaUrl(form.cover_url)} alt="" className="absolute inset-0 w-full h-full object-cover" />}
    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/10" />
    <div className="absolute top-5 left-5 font-mono text-[11px] uppercase tracking-widest bg-[#FF6B00] text-black px-2 py-1">{form.tag || "Тег"}</div>
    <div className="absolute bottom-6 left-6 right-6">
      <div className="font-display uppercase text-xl leading-tight">{form.title || "Заголовок новости"}</div>
      {form.excerpt && <p className="text-sm text-zinc-300 mt-3 line-clamp-3">{form.excerpt}</p>}
    </div>
  </div>
);

const CoverPicker = ({ value, onChange }) => {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/admin/upload", fd);
      onChange(data.url);
      toast.success("Обложка загружена");
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {PRESETS.map((p) => (
          <button type="button" key={p} onClick={() => onChange(p)} data-testid={`news-cover-preset-${p.split("/").pop().split(".")[0]}`}
            className={`aspect-square overflow-hidden border-2 transition-colors ${value === p ? "border-[#FF6B00]" : "border-transparent opacity-70 hover:opacity-100"}`}>
            <img src={p} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={upload} data-testid="news-cover-input" />
      <button type="button" onClick={() => ref.current?.click()} disabled={busy} className="h-10 px-4 flex items-center gap-2 text-sm border border-white/15 hover:border-orange-500/60" data-testid="news-cover-upload-btn">
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}Загрузить свою обложку
      </button>
    </div>
  );
};

export default function AdminNewsEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [meta, setMeta] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return undefined;
    let alive = true;
    api.get(`/admin/news/${id}`).then(({ data }) => {
      if (!alive) return;
      setForm({ title: data.title, tag: data.tag, excerpt: data.excerpt, content: data.content, cover_url: data.cover_url, featured: data.featured });
      setMeta(data);
    }).catch((e) => toast.error(errorText(e)));
    return () => { alive = false; };
  }, [id]);

  const set = (k) => (e) => setForm({ ...form, [k]: e?.target ? e.target.value : e });

  const save = async (publish) => {
    setSaving(true);
    try {
      const { data } = id ? await api.put(`/admin/news/${id}`, form) : await api.post("/admin/news", form);
      if (publish !== undefined && can("news.publish")) await api.post(`/admin/news/${data.id}/publish`, { published: publish });
      toast.success(publish ? "Новость опубликована" : "Изменения сохранены");
      navigate("/admin/news");
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-testid="news-editor-page">
      <Link to="/admin/news" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-6" data-testid="news-editor-back"><ArrowLeft size={15} />К списку</Link>
      <PageHeader kicker={id ? "Редактирование" : "Новая публикация"} title={id ? "Редактировать новость" : "Создать новость"}
        actions={meta && <StatusBadge status={meta.status} />} />
      <div className="grid lg:grid-cols-[1fr_340px] gap-4">
        <Panel testId="news-editor-form">
          <div className="space-y-5">
            <div className="grid sm:grid-cols-[1fr_200px] gap-5">
              <div className="space-y-2"><Label>Заголовок</Label><Input value={form.title} onChange={set("title")} maxLength={160} className={fieldCls} data-testid="news-title-input" /></div>
              <div className="space-y-2"><Label>Тег</Label><Input value={form.tag} onChange={set("tag")} maxLength={30} className={fieldCls} data-testid="news-tag-input" /></div>
            </div>
            <div className="space-y-2"><Label>Краткое описание</Label><Textarea rows={2} maxLength={300} value={form.excerpt} onChange={set("excerpt")} className={`${fieldCls} h-auto`} data-testid="news-excerpt-input" /></div>
            <div className="space-y-2">
              <Label>Текст статьи</Label>
              <Textarea rows={12} value={form.content} onChange={set("content")} className={`${fieldCls} h-auto`} data-testid="news-content-input" />
              <p className="text-xs text-zinc-400">Разделяйте абзацы пустой строкой.</p>
            </div>
            <div className="space-y-2"><Label>Обложка</Label><CoverPicker value={form.cover_url} onChange={set("cover_url")} /></div>
            <label className="flex items-center gap-3 text-sm">
              <Switch checked={form.featured} onCheckedChange={set("featured")} data-testid="news-featured-switch" />Главная новость (крупная карточка)
            </label>
          </div>
        </Panel>
        <div className="space-y-4 lg:sticky lg:top-8 self-start">
          <Preview form={form} />
          <div className="flex flex-col gap-2">
            {can("news.publish") && (
              <button onClick={() => save(true)} disabled={saving || form.title.length < 3} className="btn-primary h-12 text-sm flex items-center justify-center gap-2 disabled:opacity-50" data-testid="news-save-publish-btn">
                {saving && <Loader2 size={15} className="animate-spin" />}Сохранить и опубликовать
              </button>
            )}
            <button onClick={() => save(meta?.status === "published" ? undefined : can("news.publish") ? false : undefined)} disabled={saving || form.title.length < 3}
              className="h-12 text-sm border border-white/15 hover:border-orange-500/60 disabled:opacity-50" data-testid="news-save-draft-btn">
              {meta?.status === "published" ? "Сохранить изменения" : "Сохранить черновик"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
