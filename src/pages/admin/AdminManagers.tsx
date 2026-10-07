import { useState } from "react";
import { MapPin, Phone } from "lucide-react";
import { useStore } from "../../store/useStore";
import { PhotoUpload } from "../../components/PhotoUpload";
import { StudentPhoto } from "../../components/StudentPhoto";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Card, CardRow } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import {
  TableWrap,
  tableActionsCell,
  tableCell,
  tableCellMuted,
  tableHeadCell,
} from "../../components/ui/TableWrap";
import { FormActions, FormStack } from "../../components/ui/FormStack";
import { validateUserFields } from "../../lib/validation";
import { useFormValidation } from "../../hooks/useFormValidation";
import { toastError, toastSuccess } from "../../lib/toast";
import { toUserMessage } from "../../lib/userError";
import type { Manager } from "../../types";

export function AdminManagers() {
  const branches = useStore((s) => s.branches);
  const managers = useStore((s) => s.managers);
  const getBranch = useStore((s) => s.getBranch);
  const actionError = useStore((s) => s.actionError);
  const clearActionError = useStore((s) => s.clearActionError);
  const addManager = useStore((s) => s.addManager);
  const updateManager = useStore((s) => s.updateManager);
  const setManagerActive = useStore((s) => s.setManagerActive);

  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<Manager | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const { errors, clearField, clearAll, validate } = useFormValidation<
    "name" | "email" | "password" | "phone" | "branchId"
  >();

  const reset = () => {
    setName("");
    setEmail("");
    setPassword("");
    setPhone("");
    setAddress("");
    setPhoto(undefined);
    setBranchId(branches[0]?.id ?? "");
    setEditing(null);
    clearAll();
  };

  const save = async () => {
    if (
      !validate(() =>
        validateUserFields(
          { name, email, password, phone, branchId },
          { requirePassword: !editing },
        ),
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      setNotice("");
      const profileFields = {
        phone: phone.trim(),
        address: address.trim(),
        photo,
      };
      if (editing) {
        const result = await updateManager(editing.id, {
          name: name.trim(),
          email: email.trim(),
          branchId,
          ...profileFields,
        });
        if (!result.branchAssigned) {
          setNotice(
            "Name and email saved. Branch assignment needs a database update — run supabase/migration_users.sql in Supabase SQL Editor.",
          );
        } else {
          toastSuccess(`${name.trim()} was updated.`, "Manager saved");
        }
      } else {
        const manager = await addManager({
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
          branchId,
          ...profileFields,
        });
        if (!manager.branchId && branchId) {
          setNotice(
            "Manager created. Run supabase/migration_users.sql in Supabase SQL Editor to enable branch assignment.",
          );
        } else {
          toastSuccess(`${manager.name} can now sign in.`, "Manager created");
        }
      }
      setOpen(false);
      reset();
    } catch {
      /* actionError in store */
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (m: Manager) => {
    clearActionError();
    setNotice("");
    setEditing(m);
    setName(m.name);
    setEmail(m.email);
    setPhone(m.phone);
    setAddress(m.address);
    setPhoto(m.photo);
    setBranchId(m.branchId || (branches[0]?.id ?? ""));
    setPassword("");
    clearAll();
    setOpen(true);
  };

  const toggleActive = async (m: Manager) => {
    const next = !m.active;
    clearActionError();
    setNotice("");
    try {
      await setManagerActive(m.id, next);
      toastSuccess(
        next ? `${m.name} can sign in again.` : `${m.name} can no longer sign in.`,
        next ? "Manager activated" : "Manager deactivated",
      );
    } catch (e) {
      toastError(
        toUserMessage(e, "Couldn't update status. Please try again."),
        "Update failed",
      );
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Managers"
        subtitle="One manager per branch — they manage users and students"
        action={
          <Button
            onClick={() => { reset(); setOpen(true); }}
            disabled={branches.length === 0}
          >
            Add manager
          </Button>
        }
      />

      {branches.length === 0 && (
        <p className="text-sm text-mist">Add a branch first before creating managers.</p>
      )}

      {notice && (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {notice}
        </p>
      )}

      {actionError && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      )}

      <div className="space-y-3 md:hidden">
        {managers.map((m) => (
          <CardRow
            key={m.id}
            actions={
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 whitespace-nowrap px-4 sm:min-w-[5.5rem] sm:flex-none sm:px-5"
                  onClick={() => openEdit(m)}
                >
                  Edit
                </Button>
                <Button
                  variant={m.active ? "danger" : "outline"}
                  size="sm"
                  className="flex-1 whitespace-nowrap px-4 sm:min-w-[7.5rem] sm:flex-none sm:px-5"
                  onClick={() => void toggleActive(m)}
                >
                  {m.active ? "Deactivate" : "Activate"}
                </Button>
              </>
            }
          >
            <div className="flex items-start gap-3">
              <StudentPhoto student={{ name: m.name, photo: m.photo }} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-cerulean">{m.name}</p>
                  <Badge tone={m.active ? "success" : "neutral"}>
                    {m.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="break-all text-sm text-mist">{m.email}</p>
                <p className="text-sm text-mist">
                  Branch: {getBranch(m.branchId)?.name ?? "—"}
                </p>
                {m.phone && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-mist">
                    <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {m.phone}
                  </p>
                )}
                {m.address && (
                  <p className="mt-1 flex items-start gap-1.5 text-sm text-mist">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    {m.address}
                  </p>
                )}
              </div>
            </div>
          </CardRow>
        ))}
        {managers.length === 0 && <p className="text-sm text-mist">No managers yet.</p>}
      </div>

      <Card padding="sm" className="hidden md:block">
        <TableWrap>
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-morning">
                <th className={tableHeadCell}>Manager</th>
                <th className={tableHeadCell}>Phone</th>
                <th className={tableHeadCell}>Address</th>
                <th className={tableHeadCell}>Branch</th>
                <th className={tableHeadCell}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {managers.map((m) => (
                <tr key={m.id} className="border-b border-morning last:border-0">
                  <td className={tableCell}>
                    <div className="flex items-center gap-3">
                      <StudentPhoto student={{ name: m.name, photo: m.photo }} size="sm" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-cerulean">{m.name}</p>
                          <Badge tone={m.active ? "success" : "neutral"}>
                            {m.active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="truncate text-sm text-mist">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className={tableCellMuted}>{m.phone || "—"}</td>
                  <td className={tableCellMuted}>{m.address || "—"}</td>
                  <td className={tableCellMuted}>{getBranch(m.branchId)?.name ?? "—"}</td>
                  <td className={tableActionsCell}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="whitespace-nowrap px-4 sm:px-5"
                      onClick={() => openEdit(m)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant={m.active ? "danger" : "outline"}
                      size="sm"
                      className="ml-2 whitespace-nowrap px-4 sm:px-5"
                      onClick={() => void toggleActive(m)}
                    >
                      {m.active ? "Deactivate" : "Activate"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        {managers.length === 0 && <p className="text-sm text-mist">No managers yet.</p>}
      </Card>

      <Modal
        open={open}
        wide
        onClose={() => { setOpen(false); reset(); }}
        title={editing ? "Edit manager" : "New manager"}
        footer={
          <FormActions>
            <Button variant="outline" onClick={() => { setOpen(false); reset(); }}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save" : "Create"}
            </Button>
          </FormActions>
        }
      >
        <FormStack>
          <PhotoUpload name={name} photo={photo} onChange={setPhoto} />
          <Input
            label="Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clearField("name");
            }}
            error={errors.name}
            required
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearField("email");
            }}
            error={errors.email}
            required
          />
          <Input
            label="Phone number"
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              clearField("phone");
            }}
            error={errors.phone}
          />
          <Input
            label="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <Select
            label="Branch"
            value={branchId}
            onChange={(e) => {
              setBranchId(e.target.value);
              clearField("branchId");
            }}
            error={errors.branchId}
            options={branches.map((b) => ({ value: b.id, label: b.name }))}
          />
          {!editing && (
            <>
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearField("password");
                }}
                error={errors.password}
                required
              />
              <p className="text-xs leading-relaxed text-mist">
                Turn off Confirm email in Supabase Auth settings.
              </p>
            </>
          )}
        </FormStack>
      </Modal>
    </div>
  );
}
