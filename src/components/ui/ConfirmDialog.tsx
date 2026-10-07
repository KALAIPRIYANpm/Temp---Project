import { useEffect, useId, useRef, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { lockBodyScroll, unlockBodyScroll } from "../../lib/bodyScrollLock";
import { Button } from "./Button";
import { FormActions } from "./FormStack";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirming?: boolean;
  confirmingLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  confirming = false,
  confirmingLabel = "Deleting…",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => cancelRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !confirming) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, confirming, onCancel]);

  useEffect(() => {
    if (!open) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Dismiss"
        className="absolute inset-0 bg-cerulean/50"
        disabled={confirming}
        onClick={() => {
          if (!confirming) onCancel();
        }}
      />

      <div
        className="relative z-10 w-full overflow-hidden rounded-t-2xl border border-morning bg-white shadow-xl sm:max-w-sm sm:rounded-xl"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2 sm:hidden" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-mist/40" />
        </div>

        <div className="px-5 pb-2 pt-4 sm:px-6 sm:pt-6">
          <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
            <div
              className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600"
              aria-hidden
            >
              <AlertTriangle className="h-6 w-6" strokeWidth={2} />
            </div>
            <h2
              id={titleId}
              className="text-lg font-semibold leading-tight text-cerulean"
            >
              {title}
            </h2>
            <div
              id={descriptionId}
              className="mt-2 text-sm leading-relaxed text-mist"
            >
              {description}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0))] sm:px-6 sm:pb-5">
          <FormActions>
            <Button
              ref={cancelRef}
              variant="outline"
              onClick={onCancel}
              disabled={confirming}
            >
              {cancelLabel}
            </Button>
            <Button variant="danger" onClick={onConfirm} disabled={confirming}>
              {confirming ? confirmingLabel : confirmLabel}
            </Button>
          </FormActions>
        </div>
      </div>
    </div>
  );
}
