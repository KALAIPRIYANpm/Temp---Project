import { useToastStore, type ToastType } from "../store/useToastStore";

export function showToast(options: {
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}) {
  useToastStore.getState().show(options);
}

export function toastSuccess(message: string, title?: string, duration?: number) {
  showToast({ type: "success", title, message, duration });
}

export function toastError(message: string, title?: string, duration?: number) {
  showToast({ type: "error", title, message, duration: duration ?? 4500 });
}

export function toastWarning(message: string, title?: string, duration?: number) {
  showToast({ type: "warning", title, message, duration });
}

export function toastInfo(message: string, title?: string, duration?: number) {
  showToast({ type: "info", title, message, duration });
}
