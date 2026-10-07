import { useEffect, useState } from "react";
import { LayoutGrid, LayoutList } from "lucide-react";
import { useStore } from "../../store/useStore";
import {
  branchFromRecord,
  branchListTitle,
  emptyBranchInput,
  type BranchInput,
} from "../../lib/branch";
import { countActiveStudentsByBranch } from "../../lib/db";
import { validateBranchFields } from "../../lib/validation";
import { useFormValidation } from "../../hooks/useFormValidation";
import { BranchCard } from "../../components/BranchCard";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { FormActions, FormStack } from "../../components/ui/FormStack";
import type { Branch } from "../../types";

type ViewMode = "list" | "grid";

function trimBranchInput(data: BranchInput): BranchInput {
  return {
    name: data.name.trim(),
    branchName: data.branchName.trim(),
    city: data.city.trim(),
    country: data.country.trim(),
    address: data.address.trim(),
    mapLocation: data.mapLocation.trim(),
    contact1Name: data.contact1Name.trim(),
    contact1Phone: data.contact1Phone.trim(),
    contact2Name: data.contact2Name.trim(),
    contact2Phone: data.contact2Phone.trim(),
  };
}

function SectionTitle({ children }: { children: string }) {
  return (
    <p className="border-b border-morning pb-1 text-xs font-semibold uppercase tracking-wide text-mist">
      {children}
    </p>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
}) {
  return (
    <div
      className="inline-flex rounded-lg border border-morning bg-white p-1"
      role="group"
      aria-label="Branch view"
    >
      <button
        type="button"
        onClick={() => onChange("list")}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          view === "list"
            ? "bg-cerulean text-white"
            : "text-mist hover:bg-morning/40 hover:text-cerulean"
        }`}
        aria-pressed={view === "list"}
      >
        <LayoutList className="h-4 w-4" aria-hidden />
        List
      </button>
      <button
        type="button"
        onClick={() => onChange("grid")}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          view === "grid"
            ? "bg-cerulean text-white"
            : "text-mist hover:bg-morning/40 hover:text-cerulean"
        }`}
        aria-pressed={view === "grid"}
      >
        <LayoutGrid className="h-4 w-4" aria-hidden />
        Grid
      </button>
    </div>
  );
}

export function AdminBranches() {
  const branches = useStore((s) => s.branches);
  const addBranch = useStore((s) => s.addBranch);
  const updateBranch = useStore((s) => s.updateBranch);
  const deleteBranch = useStore((s) => s.deleteBranch);

  const [view, setView] = useState<ViewMode>("grid");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [deleting, setDeleting] = useState<Branch | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [form, setForm] = useState<BranchInput>(emptyBranchInput());
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const { errors, clearField, clearAll, validate } = useFormValidation<
    "name" | "contact1Phone" | "contact2Phone" | "mapLocation"
  >();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const counts = await countActiveStudentsByBranch();
        if (!cancelled) setStudentCounts(counts);
      } catch {
        if (!cancelled) setStudentCounts({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [branches]);

  const setField = <K extends keyof BranchInput>(key: K, value: BranchInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "name") clearField("name");
    if (key === "contact1Phone") clearField("contact1Phone");
    if (key === "contact2Phone") clearField("contact2Phone");
    if (key === "mapLocation") clearField("mapLocation");
  };

  const reset = () => {
    setForm(emptyBranchInput());
    setEditing(null);
    clearAll();
  };

  const openEdit = (branch: Branch) => {
    setEditing(branch);
    setForm(branchFromRecord(branch));
    clearAll();
    setOpen(true);
  };

  const save = async () => {
    const data = trimBranchInput(form);
    if (!validate(() => validateBranchFields(data))) return;
    try {
      if (editing) {
        await updateBranch(editing.id, data);
      } else {
        await addBranch(data);
      }
      setOpen(false);
      reset();
    } catch {
      /* store sets actionError */
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await deleteBranch(deleting.id);
      setDeleting(null);
    } catch {
      /* store sets actionError */
    } finally {
      setDeletingBusy(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Branches"
        action={<Button onClick={() => { reset(); setOpen(true); }}>Add branch</Button>}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-mist">
          {branches.length} branch{branches.length === 1 ? "" : "es"}
        </p>
        {branches.length > 0 && <ViewToggle view={view} onChange={setView} />}
      </div>

      {branches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-morning bg-white px-6 py-12 text-center">
          <p className="text-sm text-mist">No branches yet. Add your first branch to get started.</p>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {branches.map((b) => (
            <BranchCard
              key={b.id}
              branch={b}
              studentCount={studentCounts[b.id] ?? 0}
              view="grid"
              onEdit={() => openEdit(b)}
              onDelete={() => setDeleting(b)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {branches.map((b) => (
            <BranchCard
              key={b.id}
              branch={b}
              studentCount={studentCounts[b.id] ?? 0}
              view="list"
              onEdit={() => openEdit(b)}
              onDelete={() => setDeleting(b)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete branch?"
        description={
          deleting ? (
            <>
              <p>
                You are about to permanently delete{" "}
                <span className="font-medium text-cerulean">
                  {branchListTitle(deleting)}
                </span>
                .
              </p>
              {(studentCounts[deleting.id] ?? 0) > 0 && (
                <p className="mt-2">
                  This branch has{" "}
                  <span className="font-medium text-cerulean">
                    {studentCounts[deleting.id]} active student
                    {studentCounts[deleting.id] === 1 ? "" : "s"}
                  </span>
                  . Related records may be affected.
                </p>
              )}
              <p className="mt-2 font-medium text-red-600">This cannot be undone.</p>
            </>
          ) : null
        }
        confirming={deletingBusy}
        onConfirm={() => void confirmDelete()}
        onCancel={() => {
          if (!deletingBusy) setDeleting(null);
        }}
      />

      <Modal
        open={open}
        wide
        onClose={() => {
          setOpen(false);
          reset();
        }}
        title={editing ? "Edit branch" : "New branch"}
        footer={
          <FormActions>
            <Button variant="outline" onClick={() => { setOpen(false); reset(); }}>
              Cancel
            </Button>
            <Button onClick={() => void save()}>
              {editing ? "Save" : "Create"}
            </Button>
          </FormActions>
        }
      >
        <FormStack>
          <SectionTitle>Basic</SectionTitle>
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            error={errors.name}
            required
          />
          <Input
            label="Branch name"
            value={form.branchName}
            onChange={(e) => setField("branchName", e.target.value)}
          />

          <SectionTitle>Location</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="City"
              value={form.city}
              onChange={(e) => setField("city", e.target.value)}
            />
            <Input
              label="Country"
              value={form.country}
              onChange={(e) => setField("country", e.target.value)}
            />
          </div>
          <Input
            label="Address"
            value={form.address}
            onChange={(e) => setField("address", e.target.value)}
          />
          <Input
            label="Map location"
            value={form.mapLocation}
            onChange={(e) => setField("mapLocation", e.target.value)}
            error={errors.mapLocation}
            placeholder="Google Maps link or coordinates"
          />

          <SectionTitle>Point of contact 1</SectionTitle>
          <Input
            label="Full name"
            value={form.contact1Name}
            onChange={(e) => setField("contact1Name", e.target.value)}
          />
          <Input
            label="Phone number"
            type="tel"
            value={form.contact1Phone}
            onChange={(e) => setField("contact1Phone", e.target.value)}
            error={errors.contact1Phone}
          />

          <SectionTitle>Point of contact 2</SectionTitle>
          <Input
            label="Full name"
            value={form.contact2Name}
            onChange={(e) => setField("contact2Name", e.target.value)}
          />
          <Input
            label="Phone number"
            type="tel"
            value={form.contact2Phone}
            onChange={(e) => setField("contact2Phone", e.target.value)}
            error={errors.contact2Phone}
          />
        </FormStack>
      </Modal>
    </div>
  );
}
