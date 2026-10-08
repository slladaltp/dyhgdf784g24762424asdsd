import { useEffect, useState } from "react";
import { Loader2, Trash2, Ban, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { api, errorText, fmtDate } from "@/lib/api";
import { UserAvatar, StatusBadge, ActivityList, fieldCls } from "@/components/panel/ui";

const ECON = [["wallet", "cash", "Монеты"], ["wallet", "bank", "Банк монет"], ["wallet", "coins", "YanaCoins"], ["stats", "level", "Уровень"], ["stats", "exp", "Опыт"], ["stats", "reputation", "Репутация"]];

const EconomyForm = ({ u, onSaved }) => {
  const [vals, setVals] = useState({ wallet: { ...u.wallet }, stats: { ...u.stats } });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch(`/admin/users/${u.id}/economy`, vals);
      toast.success("Баланс и статистика обновлены");
      onSaved(data);
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="space-y-4" data-testid="user-dialog-economy">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {ECON.map(([g, k, label]) => (
          <div key={k} className="space-y-1">
            <Label className="text-xs text-zinc-400">{label}</Label>
            <Input type="number" min={0} value={vals[g][k]} className={fieldCls} data-testid={`user-dialog-${k}-input`}
              onChange={(e) => setVals({ ...vals, [g]: { ...vals[g], [k]: Math.max(0, parseInt(e.target.value || "0", 10)) } })} />
          </div>
        ))}
      </div>
      <button onClick={save} disabled={saving} className="btn-primary h-10 px-5 text-sm flex items-center gap-2" data-testid="user-dialog-economy-save">
        {saving && <Loader2 size={14} className="animate-spin" />}Сохранить экономику
      </button>
    </div>
  );
};

export const UserDialog = ({ userId, roles, onClose, onChanged }) => {
  const { user: me, can } = useAuth();
  const [u, setU] = useState(null);

  useEffect(() => {
    if (!userId) { setU(null); return undefined; }
    let alive = true;
    api.get(`/admin/users/${userId}`).then((r) => alive && setU(r.data)).catch((e) => toast.error(errorText(e)));
    return () => { alive = false; };
  }, [userId]);

  const patch = async (body, msg) => {
    try {
      const { data } = await api.patch(`/admin/users/${u.id}`, body);
      setU({ ...u, ...data });
      toast.success(msg);
      onChanged();
    } catch (e) {
      toast.error(errorText(e));
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/admin/users/${u.id}`);
      toast.success("Пользователь удалён");
      onChanged();
      onClose();
    } catch (e) {
      toast.error(errorText(e));
    }
  };

  const isSelf = u && u.id === me.id;
  const canManage = can("users.manage") && !isSelf;

  return (
    <Dialog open={!!userId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl rounded-none bg-[#0f0f12] border-white/10 max-h-[90vh] overflow-y-auto" data-testid="user-dialog">
        {!u ? <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-orange-400" /></div> : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-4">
                <UserAvatar user={u} size={64} className="clip-frame" />
                <div className="text-left min-w-0">
                  <DialogTitle className="font-display uppercase text-xl truncate" data-testid="user-dialog-username">{u.username}</DialogTitle>
                  <DialogDescription className="text-zinc-400 truncate">{u.email} · с {fmtDate(u.created_at)}</DialogDescription>
                  <div className="mt-2"><StatusBadge status={u.status} /></div>
                </div>
              </div>
            </DialogHeader>

            <div className="grid sm:grid-cols-2 gap-4 mt-2">
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">Роль</Label>
                <Select value={u.role} disabled={!canManage || me.role !== "admin"} onValueChange={(v) => patch({ role: v }, "Роль изменена")}>
                  <SelectTrigger className={fieldCls} data-testid="user-dialog-role-select"><SelectValue /></SelectTrigger>
                  <SelectContent>{roles.map((r) => <SelectItem key={r.name} value={r.name} data-testid={`user-dialog-role-${r.name}`}>{r.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">Доступ</Label>
                <button disabled={!canManage} data-testid="user-dialog-ban-toggle"
                  onClick={() => patch({ status: u.status === "banned" ? "active" : "banned" }, u.status === "banned" ? "Пользователь разблокирован" : "Пользователь заблокирован")}
                  className={`w-full h-11 flex items-center justify-center gap-2 text-sm border transition-colors disabled:opacity-40 ${u.status === "banned" ? "border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10" : "border-red-500/50 text-red-300 hover:bg-red-500/10"}`}>
                  {u.status === "banned" ? <><CheckCircle2 size={16} />Разблокировать</> : <><Ban size={16} />Заблокировать</>}
                </button>
              </div>
            </div>
            {isSelf && <p className="text-xs text-zinc-400">Свою роль и статус изменить нельзя.</p>}

            {can("users.balance") && (
              <div className="mt-4 pt-5 border-t border-white/10">
                <div className="font-mono text-[11px] uppercase tracking-widest text-orange-400 mb-3">Экономика и статистика</div>
                <EconomyForm key={u.id} u={u} onSaved={(d) => { setU({ ...u, ...d }); onChanged(); }} />
              </div>
            )}

            <div className="mt-4 pt-5 border-t border-white/10">
              <div className="font-mono text-[11px] uppercase tracking-widest text-orange-400 mb-4">Активность</div>
              <ActivityList items={u.activity} testId="user-dialog-activity" />
            </div>

            {canManage && (
              <div className="mt-4 pt-5 border-t border-white/10 flex justify-end">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="h-10 px-4 flex items-center gap-2 text-sm text-red-300 border border-red-500/40 hover:bg-red-500 hover:text-white transition-colors" data-testid="user-dialog-delete-btn">
                      <Trash2 size={15} />Удалить аккаунт
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-none bg-[#0f0f12] border-white/10">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Удалить {u.username}?</AlertDialogTitle>
                      <AlertDialogDescription>Аккаунт и история активности будут удалены без возможности восстановления.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-none" data-testid="user-dialog-delete-cancel">Отмена</AlertDialogCancel>
                      <AlertDialogAction onClick={remove} className="rounded-none bg-red-600 hover:bg-red-500 text-white" data-testid="user-dialog-delete-confirm">Удалить</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
