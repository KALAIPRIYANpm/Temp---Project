import type { ReactNode } from "react";
import {
  Building2,
  ExternalLink,
  MapPin,
  Pencil,
  Phone,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { branchListTitle, formatBranchFullLocation } from "../lib/branch";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import type { Branch } from "../types";

type BranchCardProps = {
  branch: Branch;
  studentCount: number;
  view: "list" | "grid";
  onEdit: () => void;
  onDelete: () => void;
};

function DetailRow({
  icon: Icon,
  children,
  className = "",
}: {
  icon: typeof MapPin;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start gap-2 text-sm text-mist ${className}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-mist/80" aria-hidden />
      <span className="min-w-0 leading-snug">{children}</span>
    </div>
  );
}

function ContactBlock({ name, phone }: { name: string; phone: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-mist">
      <span className="inline-flex items-center gap-1">
        <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>{name}</span>
      </span>
      {phone && (
        <span className="inline-flex items-center gap-1">
          <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{phone}</span>
        </span>
      )}
    </div>
  );
}

function BranchActions({
  onEdit,
  onDelete,
  compact = false,
}: {
  onEdit: () => void;
  onDelete: () => void;
  compact?: boolean;
}) {
  return (
    <div className={`flex gap-2 ${compact ? "shrink-0" : "mt-4 border-t border-morning pt-3"}`}>
      <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={onEdit}>
        <Pencil className="h-3.5 w-3.5" aria-hidden />
        Edit
      </Button>
      <Button variant="danger" size="sm" className="flex-1 gap-1.5" onClick={onDelete}>
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
        Delete
      </Button>
    </div>
  );
}

export function BranchCard({ branch, studentCount, view, onEdit, onDelete }: BranchCardProps) {
  const title = branchListTitle(branch);
  const location = formatBranchFullLocation(branch);
  const mapHref = branch.mapLocation.startsWith("http") ? branch.mapLocation : undefined;

  const header = (
    <div className="flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-morning/50 text-cerulean">
        <Building2 className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold leading-snug text-cerulean">{title}</h3>
        {branch.name && branch.name !== title && (
          <p className="mt-0.5 text-xs text-mist">ID: {branch.name}</p>
        )}
      </div>
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-morning/40 px-2.5 py-1 text-xs font-medium text-cerulean">
        <Users className="h-3.5 w-3.5" aria-hidden />
        {studentCount}
      </span>
    </div>
  );

  const gridDetails = (
    <div className="space-y-2">
      {location !== "—" && <DetailRow icon={MapPin}>{location}</DetailRow>}
      {branch.contact1Name && (
        <ContactBlock name={branch.contact1Name} phone={branch.contact1Phone} />
      )}
      {branch.contact2Name && (
        <ContactBlock name={branch.contact2Name} phone={branch.contact2Phone} />
      )}
      {branch.mapLocation && (
        mapHref ? (
          <a
            href={mapHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-cerulean hover:underline"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            View on map
          </a>
        ) : (
          <DetailRow icon={MapPin}>{branch.mapLocation}</DetailRow>
        )
      )}
    </div>
  );

  const mapLink = branch.mapLocation ? (
    mapHref ? (
      <a
        href={mapHref}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-cerulean hover:underline"
      >
        <ExternalLink className="h-4 w-4" aria-hidden />
        View on map
      </a>
    ) : (
      <DetailRow icon={MapPin}>{branch.mapLocation}</DetailRow>
    )
  ) : null;

  const listDetails = (
    <div className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
      <div className="space-y-1.5">
        {location !== "—" && <DetailRow icon={MapPin}>{location}</DetailRow>}
        {mapLink}
      </div>
      <div className="space-y-1.5">
        {branch.contact1Name && (
          <ContactBlock name={branch.contact1Name} phone={branch.contact1Phone} />
        )}
        {branch.contact2Name && (
          <ContactBlock name={branch.contact2Name} phone={branch.contact2Phone} />
        )}
      </div>
    </div>
  );

  if (view === "grid") {
    return (
      <Card className="flex h-full flex-col transition-shadow hover:shadow-md" padding="sm">
        {header}
        <div className="mt-4 flex-1 space-y-2">{gridDetails}</div>
        <BranchActions onEdit={onEdit} onDelete={onDelete} />
      </Card>
    );
  }

  return (
    <Card className="transition-shadow hover:shadow-md" padding="sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-morning/50 text-cerulean">
          <Building2 className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold leading-snug text-cerulean">{title}</h3>
            {branch.name && branch.name !== title && (
              <span className="text-xs text-mist">· {branch.name}</span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-morning/40 px-2 py-0.5 text-xs font-medium text-cerulean">
              <Users className="h-3.5 w-3.5" aria-hidden />
              {studentCount}
            </span>
          </div>
          {listDetails}
        </div>
        <div className="flex shrink-0 flex-col gap-1.5">
          <Button variant="outline" size="sm" className="gap-1 px-2.5" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            Edit
          </Button>
          <Button variant="danger" size="sm" className="gap-1 px-2.5" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}
