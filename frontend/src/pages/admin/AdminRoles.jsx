import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Lock, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { api, errorText } from "@/lib/api";
import { PageHeader, RoleBadge, fieldCls } from "@/components/panel/ui";

const RoleCard = ({ role, perms, editable, onSaved, delay }) => {
  const [sel, setSel] = useState(role.permissions);
  const [saving, setSaving] = useState(false);
  const dirty = sel.length !== role.permissions.length || sel.some((p) => !role.permissions.includes(p));
  const locked = role.name === "admin" || !editable;

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/admin/roles/${role.name}`, { name: role.name, title: role.title, color: role.color, permissions: sel });
      toast.success(`Права роли «${role.title}» обновлены`);
      onSaved();
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    try {
      await api.delete(`/admin/roles/${role.name}`);
      toast.success("Роль удалена");
      onSaved();
    } catch (e) {
      toast.error(errorText(e));
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="bg-[#121215] border border-white/10 flex flex-col" data-testid={`role-card-${role.name}`}>
      <div className="h-1" style={{ background: role.color }} />
      <div className="p-5 flex items-start justify-between gap-3 border-b border-white/10">
        <div>
          <RoleBadge role={role.name} title={role.title} color={role.color} />
          <div className="font-mono text-xs text-zinc-400 mt-3">{role.name} · {role.users} польз.</div>
        </div>
        {role.name === "admin" && <Lock size={16} className="text-orange-400" />}
        {!role.system && editable && (
          <button onClick={remove} className="p-2 text-zinc-400 hover:text-red-400" aria-label="Удалить роль" data-testid={`role-delete-${role.name}`}><Trash2 size={16} /></button>
        )}
      </div>
      <div className="p-5 space-y-3 flex-1">
        {perms.map((p) => (
          <label key={p.key} className={`flex items-center gap-3 text-sm ${locked ? "opacity-70" : "cursor-pointer"}`}>
            <Checkbox checked={sel.includes(p.key)} disabled={locked} data-testid={`role-${role.name}-perm-${p.key}`}
              onCheckedChange={(v) => setSel(v ? [...sel, p.key] : sel.filter((x) => x !== p.key))}
              className="rounded-none border-white/30 data-[state=checked]:bg-[#FF6B00] data-[state=checked]:border-[#FF6B00] data-[state=checked]:text-black" />
            <span className="text-zinc-200">{p.label}</span>
          </label>
        ))}
      </div>
      {!locked && (
        <div className="p-5 pt-0">
          <button onClick={save} disabled={!dirty || saving} className="btn-primary w-full h-10 text-sm flex items-center justify-center gap-2 disabled:opacity-40" data-testid={`role-save-${role.name}`}>
            {saving && <Loader2 size={14} className="animate-spin" />}Сохранить права
          </button>
        </div>
      )}
    </motion.div>
  );
};

const CreateRole = ({ open, onOpenChange, onCreated }) => {
  const [form, setForm] = useState({ name: "", title: "", color: "#22C55E" });
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/roles", { ...form, permissions: ["admin.access"] });
      toast.success("Роль создана");
      setForm({ name: "", title: "", color: "#22C55E" });
      onOpenChange(false);
      onCreated();
    } catch (err) {
      toast.error(errorText(err));
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none bg-[#0f0f12] border-white/10" data-testid="create-role-dialog">
        <DialogHeader>
          <DialogTitle className="font-display uppercase">Новая роль</DialogTitle>
          <DialogDescription>Права можно настроить после создания.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2"><Label>Название</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={fieldCls} placeholder="Ивент-мастер" data-testid="create-role-title" /></div>
          <div className="space-y-2"><Label>Ключ (латиница)</Label><Input required pattern="[a-z0-9_]{2,24}" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value.toLowerCase() })} className={fieldCls} placeholder="event_master" data-testid="create-role-name" /></div>
          <div className="space-y-2"><Label>Цвет</Label><input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-11 w-20 bg-transparent border border-white/10" data-testid="create-role-color" /></div>
          <button type="submit" className="btn-primary h-11 w-full text-sm" data-testid="create-role-submit">Создать роль</button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default function AdminRoles() {
  const { can } = useAuth();
  const [roles, setRoles] = useState([]);
  const [perms, setPerms] = useState([]);
  const [open, setOpen] = useState(false);
  const editable = can("roles.manage");

  const load = useCallback(() => {
    api.get("/admin/roles").then((r) => setRoles(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);
  useEffect(() => {
    load();
    api.get("/admin/permissions").then((r) => setPerms(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, [load]);

  return (
    <div data-testid="admin-roles-page">
      <PageHeader kicker="Админ-панель" title="Роли и права"
        actions={editable && <button onClick={() => setOpen(true)} className="btn-primary h-11 px-5 flex items-center gap-2 text-sm" data-testid="admin-roles-create-btn"><Plus size={16} />Новая роль</button>} />
      {!editable && <p className="text-sm text-zinc-400 mb-5">Только просмотр: для изменения ролей нужно право «Управление ролями».</p>}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {roles.map((r, i) => <RoleCard key={`${r.name}-${r.permissions.join()}`} role={r} perms={perms} editable={editable} onSaved={load} delay={i * 0.05} />)}
      </div>
      <CreateRole open={open} onOpenChange={setOpen} onCreated={load} />
    </div>
  );
}
