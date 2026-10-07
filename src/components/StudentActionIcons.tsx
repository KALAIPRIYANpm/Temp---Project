import { Eye, Pencil, QrCode, Trash2 } from "lucide-react";

const iconBtn =
  "touch-target inline-flex h-11 w-11 shrink-0 items-center justify-center rounded border border-morning bg-white text-cerulean transition-colors hover:bg-morning/40 active:scale-95 sm:h-10 sm:w-10";

export function StudentActionIcons({
  onView,
  onEdit,
  onQr,
  onDelete,
  compact,
}: {
  onView?: () => void;
  onEdit?: () => void;
  onQr?: () => void;
  onDelete?: () => void;
  compact?: boolean;
}) {
  const wrap = compact ? "flex items-center gap-1" : "flex flex-wrap items-center gap-2";

  return (
    <div className={wrap}>
      {onView && (
        <button type="button" className={iconBtn} aria-label="View profile" onClick={onView}>
          <Eye className="h-4 w-4" />
        </button>
      )}
      {onEdit && (
        <button type="button" className={iconBtn} aria-label="Edit student" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </button>
      )}
      {onQr && (
        <button type="button" className={iconBtn} aria-label="View QR code" onClick={onQr}>
          <QrCode className="h-4 w-4" />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          className={`${iconBtn} border-red-200 text-red-700 hover:bg-red-50`}
          aria-label="Delete student"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
