import { Input } from "./ui/Input";
import { todayKey } from "../lib/dates";

type DateRangeFieldsProps = {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  max?: string;
  className?: string;
  required?: boolean;
  fromError?: string;
  toError?: string;
};

/** Shared From / To date inputs for reports, dashboard, and attendance. */
export function DateRangeFields({
  from,
  to,
  onFromChange,
  onToChange,
  max = todayKey(),
  className = "",
  required = false,
  fromError,
  toError,
}: DateRangeFieldsProps) {
  return (
    <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${className}`}>
      <Input
        label="From"
        type="date"
        value={from}
        max={max}
        required={required}
        error={fromError}
        onChange={(e) => onFromChange(e.target.value)}
      />
      <Input
        label="To"
        type="date"
        value={to}
        max={max}
        required={required}
        error={toError}
        onChange={(e) => onToChange(e.target.value)}
      />
    </div>
  );
}
