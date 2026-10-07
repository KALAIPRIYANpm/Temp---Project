import { useState } from "react";
import { MapPin, Phone } from "lucide-react";
import { useStore } from "../../store/useStore";
import { PhotoUpload } from "../../components/PhotoUpload";
import { StudentPhoto } from "../../components/StudentPhoto";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { CardRow } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { FormActions, FormStack } from "../../components/ui/FormStack";
import { validateUserFields } from "../../lib/validation";
import { useFormValidation } from "../../hooks/useFormValidation";
import { toastError, toastSuccess } from "../../lib/toast";
import { toUserMessage } from "../../lib/userError";
import type { BranchUser } from "../../types";

export function ManagerUsers() {
  const session = useStore((s) => s.session);
  const users = useStore((s) => s.users);
  const actionError = useStore((s) => s.actionError);
  const clearActionError = useStore((s) => s.clearActionError);
  const addBranchUser = useStore((s) => s.addBranchUser);
  const updateBranchUser = useStore((s) => s.updateBranchUser);
  const setBranchUserActive = useStore((s) => s.setBranchUserActive);

  const branchId = session?.branchId ?? "";
  const branchUsers = users.filter((u) => u.branchId === branchId);
  const activeCount = branchUsers.filter((u) => u.active).length;

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BranchUser | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const { errors, clearField, clearAll, validate } = useFormValidation<
    "name" | "email" | "password" | "phone"
  >();

  const reset = () => {
    setName("");
    setEmail("");
    setPassword("");
    setPhone("");
    setAddress("");
    setPhoto(undefined);
    setEditing(null);
    clearAll();
  };

  const save = async () => {
    if (
      !validate(() =>
        validateUserFields(
          { name, email, password, phone },
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
    setEditing(u);
    setName(u.name);
    setEmail(u.email);
    setPhone(u.phone);
    setAddress(u.address);
    setPhoto(u.photo);
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

  if (!branchId) {
    return <p className="text-sm text-mist">No branch assigned. Contact admin.</p>;
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Branch users"
        subtitle="Users who scan QR and edit attendance (2–3 per branch)"
        action={
          <Button onClick={() => { reset(); setOpen(true); }} disabled={activeCount >= 5}>
            Add user
          </Button>
        }
      />

      {actionError && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      )}

      <div className="space-y-3">
        {branchUsers.map((u) => (
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
        {branchUsers.length === 0 && (
          <p className="text-sm text-mist">No users yet. Add staff who will mark attendance.</p>
        )}
      </div>

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
