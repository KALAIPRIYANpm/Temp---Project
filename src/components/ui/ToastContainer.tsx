import { AlertCircle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useToastStore, type ToastItem, type ToastType } from "../../store/useToastStore";

const styles: Record<
  ToastType,
  { wrap: string; icon: typeof CheckCircle2; iconClass: string }
> = {
  success: {
    wrap: "border-emerald-200 bg-emerald-50 text-emerald-950",
    icon: CheckCircle2,
    iconClass: "text-emerald-600",
  },
  error: {
    wrap: "border-red-200 bg-red-50 text-red-950",
    icon: XCircle,
    iconClass: "text-red-600",
  },
  warning: {
    wrap: "border-amber-200 bg-amber-50 text-amber-950",
    icon: AlertCircle,
    iconClass: "text-amber-600",
  },
  info: {
    wrap: "border-cerulean/20 bg-white text-cerulean",
    icon: Info,
    iconClass: "text-cerulean",
  },
};

function ToastCard({ toast }: { toast: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const { wrap, icon: Icon, iconClass } = styles[toast.type];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border px-3 py-2.5 shadow-md ${wrap}`}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconClass}`} aria-hidden />
      <div className="min-w-0 flex-1 text-sm">
        {toast.title && <p className="font-medium leading-snug">{toast.title}</p>}
        <p className={toast.title ? "mt-0.5 leading-snug opacity-90" : "leading-snug"}>
          {toast.message}
        </p>
      </div>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 px-4 pt-safe">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
