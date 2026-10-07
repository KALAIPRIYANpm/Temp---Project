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
import { toUserMessage } from "../../lib/userError";
import { validateUserFields } from "../../lib/validation";
import { useFormValidation } from "../../hooks/useFormValidation";
import { toastError, toastSuccess } from "../../lib/toast";
import type { BranchUser } from "../../types";

export function AdminUsers() {
  const branches = useStore((s) => s.branches);
  const users = useStore((s) => s.users);
  const getBranch = useStore((s) => s.getBranch);
  const actionError = useStore((s) => s.actionError);
  const clearActionError = useStore((s) => s.clearActionError);
  const addBranchUser = useStore((s) => s.addBranchUser);
  const updateBranchUser = useStore((s) => s.updateBranchUser);
  const setBranchUserActive = useStore((s) => s.setBranchUserActive);

  const [filterBranch, setFilterBranch] = useState<"all" | string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BranchUser | null>(null);
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

  const visibleUsers =
    filterBranch === "all"
      ? users
      : users.filter((u) => u.branchId === filterBranch);

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
      const profileFields = {
        phone: phone.trim(),
        address: address.trim(),
        photo,
      };
      if (editing) {
        await updateBranchUser(editing.id, {
          name: name.trim(),
          email: email.trim(),
          ...profileFields,
        });
        toastSuccess(`${name.trim()} was updated.`, "User saved");
      } else {
        const user = await addBranchUser({
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
          branchId,
          ...profileFields,
        });
        toastSuccess(`${user.name} can now sign in.`, "User created");
      }
      setOpen(false);
      reset();
    } catch {
      /* actionError */
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (u: BranchUser) => {
    clearActionError();
    setEditing(u);
    setName(u.name);
    setEmail(u.email);
    setPhone(u.phone);
    setAddress(u.address);
    setPhoto(u.photo);
    setBranchId(u.branchId || (branches[0]?.id ?? ""));
    setPassword("");
    clearAll();
    setOpen(true);
  };

  const toggleActive = async (u: BranchUser) => {
    const next = !u.active;
    clearActionError();
    try {
      await setBranchUserActive(u.id, next);
      toastSuccess(
        next ? `${u.name} can sign in again.` : `${u.name} can no longer sign in.`,
        next ? "User activated" : "User deactivated",
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
        title="Branch users"
        subtitle="Staff who scan QR and edit attendance — manage all branches"
        action={
          <Button
            onClick={() => { reset(); setOpen(true); }}
            disabled={branches.length === 0}
          >
            Add user
          </Button>
        }
      />

      {branches.length === 0 && (
        <p className="text-sm text-mist">Add a branch first before creating users.</p>
      )}

      <Select
        label="Filter by branch"
        value={filterBranch}
        onChange={(e) => setFilterBranch(e.target.value as "all" | string)}
        options={[
          { value: "all", label: "All branches" },
          ...branches.map((b) => ({ value: b.id, label: b.name })),
        ]}
      />

      {actionError && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      )}

      <div className="space-y-3 md:hidden">
        {visibleUsers.map((u) => (
          <CardRow
            key={u.id}
            actions={
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 whitespace-nowrap px-4 sm:min-w-[5.5rem] sm:flex-none sm:px-5"
                  onClick={() => openEdit(u)}
                >
                  Edit
                </Button>
                <Button
                  variant={u.active ? "danger" : "outline"}
                  size="sm"
                  className="flex-1 whitespace-nowrap px-4 sm:min-w-[7.5rem] sm:flex-none sm:px-5"
                  onClick={() => void toggleActive(u)}
                >
                  {u.active ? "Deactivate" : "Activate"}
                </Button>
              </>
            }
          >
            <div className="flex items-start gap-3">
              <StudentPhoto student={{ name: u.name, photo: u.photo }} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-cerulean">{u.name}</p>
                  <Badge tone={u.active ? "success" : "neutral"}>
                    {u.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="break-all text-sm text-mist">{u.email}</p>
                <p className="text-sm text-mist">
                  Branch: {getBranch(u.branchId)?.name ?? "—"}
                </p>
                {u.phone && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-mist">
                    <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {u.phone}
                  </p>
                )}
                {u.address && (
                  <p className="mt-1 flex items-start gap-1.5 text-sm text-mist">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    {u.address}
                  </p>
                )}
              </div>
            </div>
          </CardRow>
        ))}
        {visibleUsers.length === 0 && <p className="text-sm text-mist">No users yet.</p>}
      </div>

      <Card padding="sm" className="hidden md:block">
        <TableWrap>
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-morning">
                <th className={tableHeadCell}>User</th>
                <th className={tableHeadCell}>Phone</th>
                <th className={tableHeadCell}>Address</th>
                <th className={tableHeadCell}>Branch</th>
                <th className={tableHeadCell}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((u) => (
                <tr key={u.id} className="border-b border-morning last:border-0">
                  <td className={tableCell}>
                    <div className="flex items-center gap-3">
                      <StudentPhoto student={{ name: u.name, photo: u.photo }} size="sm" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-cerulean">{u.name}</p>
                          <Badge tone={u.active ? "success" : "neutral"}>
                            {u.active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="truncate text-sm text-mist">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className={tableCellMuted}>{u.phone || "—"}</td>
                  <td className={tableCellMuted}>{u.address || "—"}</td>
                  <td className={tableCellMuted}>{getBranch(u.branchId)?.name ?? "—"}</td>
                  <td className={tableActionsCell}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="whitespace-nowrap px-4 sm:px-5"
                      onClick={() => openEdit(u)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant={u.active ? "danger" : "outline"}
                      size="sm"
                      className="ml-2 whitespace-nowrap px-4 sm:px-5"
                      onClick={() => void toggleActive(u)}
                    >
                      {u.active ? "Deactivate" : "Activate"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        {visibleUsers.length === 0 && <p className="text-sm text-mist">No users yet.</p>}
      </Card>

      <Modal
        open={open}
        wide
        onClose={() => { setOpen(false); reset(); }}
        title={editing ? "Edit user" : "New user"}
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
            disabled={Boolean(editing)}
          />
          {!editing && (
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
          )}
        </FormStack>
      </Modal>
    </div>
  );
}
