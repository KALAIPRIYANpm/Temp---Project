import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { lockBodyScroll, unlockBodyScroll } from "../../lib/bodyScrollLock";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}

export function Modal({ open, onClose, title, children, footer, wide }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-cerulean/50"
        onClick={onClose}
      />

      <div
        className={`relative z-10 flex w-full flex-col overflow-hidden rounded-t-2xl border border-morning bg-white shadow-xl sm:max-h-[min(90vh,720px)] sm:rounded-xl ${
          wide ? "sm:max-w-2xl" : "sm:max-w-md"
        }`}
        style={{ maxHeight: "min(92dvh, 100%)" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile sheet handle */}
        <div className="flex shrink-0 justify-center pt-2 sm:hidden" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-mist/40" />
        </div>

        <header className="flex shrink-0 items-center gap-3 border-b border-morning px-4 py-3 sm:px-5 sm:py-4">
          <h2
            id="modal-title"
            className="min-w-0 flex-1 text-lg font-semibold leading-tight text-cerulean"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="touch-target flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-mist hover:bg-morning/50 hover:text-cerulean"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
          {children}
        </div>

        {footer && (
          <footer className="shrink-0 border-t border-morning bg-page/80 px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:px-5 sm:pb-4">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
