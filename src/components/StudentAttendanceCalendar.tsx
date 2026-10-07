import { useMemo } from "react";
import { addMonths, format, isSameDay, isSameMonth } from "date-fns";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import type { AttendanceRecord } from "../types";
import { todayKey, formatTime } from "../lib/dates";
import { calendarDaysForMonth, parseDateKey, toDateKey } from "../lib/reportRanges";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

const WEEKDAYS_FULL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_SHORT = ["S", "M", "T", "W", "T", "F", "S"];
const OM = "ॐ";

export function StudentAttendanceCalendar({
  studentId,
  attendance,
  visibleMonth,
  onMonthChange,
  selectedDateKey,
  onSelectDate,
  onEditDate,
}: {
  studentId: string;
  attendance: AttendanceRecord[];
  visibleMonth: Date;
  onMonthChange: (month: Date) => void;
  selectedDateKey: string;
  onSelectDate: (dateKey: string) => void;
  onEditDate?: (dateKey: string) => void;
}) {
  const today = todayKey();
  const gridDays = useMemo(() => calendarDaysForMonth(visibleMonth), [visibleMonth]);

  const recordsByDate = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    for (const r of attendance) {
      if (r.studentId === studentId) map.set(r.date, r);
    }
    return map;
  }, [attendance, studentId]);

  const selectedRecord = recordsByDate.get(selectedDateKey);
  const selectedDate = parseDateKey(selectedDateKey);

  return (
    <Card className="!p-3 sm:!p-5">
      <div className="mb-3 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-medium text-cerulean sm:text-lg">Attendance calendar</h2>
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-[44px] min-w-[44px] px-2"
            aria-label="Previous month"
            onClick={() => onMonthChange(addMonths(visibleMonth, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-0 flex-1 text-center text-sm font-medium text-cerulean sm:min-w-[8rem] sm:flex-none">
            {format(visibleMonth, "MMMM yyyy")}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-[44px] min-w-[44px] px-2"
            aria-label="Next month"
            onClick={() => onMonthChange(addMonths(visibleMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mb-3 flex flex-col gap-2 text-xs text-mist sm:flex-row sm:flex-wrap sm:gap-4">
        <span className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-green-700 bg-green-50 text-xs text-green-800 sm:h-8 sm:w-8 sm:text-sm">
            {OM}
          </span>
          Present
        </span>
        <span className="flex items-center gap-2">
          <span className="h-7 w-7 rounded border border-morning bg-white sm:h-8 sm:w-8" />
          Absent
        </span>
        {onEditDate && (
          <span className="flex items-center gap-1.5">
            <Pencil className="h-3 w-3" />
            Tap pencil to edit
          </span>
        )}
      </div>

      <div className="grid grid-cols-7 gap-0.5 sm:gap-1.5">
        {WEEKDAYS_FULL.map((d, i) => (
          <div
            key={d}
            className="flex aspect-square items-center justify-center text-center text-[10px] font-medium text-mist sm:text-xs"
          >
            <span className="sm:hidden">{WEEKDAYS_SHORT[i]}</span>
            <span className="hidden sm:inline">{d}</span>
          </div>
        ))}
        {gridDays.map((day) => {
          const key = toDateKey(day);
          const inMonth = isSameMonth(day, visibleMonth);
          const selected = isSameDay(day, selectedDate);
          const isFuture = key > today;
          const isPresent = !isFuture && recordsByDate.has(key);
          const canEdit = Boolean(onEditDate) && !isFuture;

          return (
            <div
              key={key}
              className={`relative aspect-square w-full min-w-0 rounded border text-cerulean transition-colors ${
                selected
                  ? "border-cerulean bg-cerulean/10 ring-1 ring-cerulean/25 sm:ring-2"
                  : "border-morning bg-white"
              } ${!inMonth ? "opacity-40" : ""} ${isPresent ? "bg-green-50" : ""}`}
            >
              <button
                type="button"
                onClick={() => onSelectDate(key)}
                title={
                  isFuture
                    ? format(day, "MMM d, yyyy")
                    : isPresent
                      ? `Present — ${format(day, "MMM d, yyyy")}`
                      : `Absent — ${format(day, "MMM d, yyyy")}`
                }
                className="absolute inset-0 rounded hover:bg-morning/20"
                aria-label={format(day, "MMMM d, yyyy")}
              />

              <span className="pointer-events-none absolute left-0.5 top-0.5 z-[1] text-[10px] font-bold leading-none sm:left-1.5 sm:top-1.5 sm:text-sm">
                {format(day, "d")}
              </span>

              {canEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditDate!(key);
                  }}
                  className="touch-target absolute right-0 top-0 z-[2] flex h-6 w-6 items-center justify-center rounded-full border border-morning bg-white text-mist shadow-sm transition-colors hover:border-cerulean hover:text-cerulean sm:right-0.5 sm:top-0.5 sm:h-7 sm:w-7"
                  aria-label={`Edit attendance for ${format(day, "MMM d, yyyy")}`}
                >
                  <Pencil className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                </button>
              )}

              {isPresent && (
                <span
                  className="pointer-events-none absolute inset-0 flex items-center justify-center pt-1 sm:pt-0"
                  aria-hidden
                >
                  <span className="flex h-[52%] w-[52%] min-h-6 min-w-6 max-h-10 max-w-10 items-center justify-center rounded-full border-2 border-green-700 text-lg leading-none text-green-800 sm:min-h-8 sm:min-w-8 sm:max-h-none sm:max-w-none sm:text-3xl">
                    {OM}
                  </span>
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 rounded border border-morning bg-page/60 px-3 py-2.5 text-sm sm:mt-4 sm:py-3">
        <p className="font-medium text-cerulean">{format(selectedDate, "EEEE, MMM d, yyyy")}</p>
        {selectedDateKey > today ? (
          <p className="mt-1 text-mist">Future date — no attendance yet.</p>
        ) : selectedRecord ? (
          <p className="mt-1 text-green-800">
            Present {OM} · checked in at {formatTime(selectedRecord.markedAt)}
          </p>
        ) : (
          <p className="mt-1 text-mist">Absent — no check-in recorded.</p>
        )}
      </div>
    </Card>
  );
}
