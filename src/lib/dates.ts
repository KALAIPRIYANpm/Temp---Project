import { format, isToday, parseISO } from "date-fns";

export function todayKey(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function formatDate(iso: string): string {
  return format(parseISO(iso), "MMM d, yyyy");
}

export function formatTime(iso: string): string {
  return format(parseISO(iso), "h:mm a");
}

export function isTodayDate(dateKey: string): boolean {
  return isToday(parseISO(dateKey));
}
