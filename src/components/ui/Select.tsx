import type { SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  wrapperClassName?: string;
}

export function Select({
  label,
  error,
  options,
  className = "",
  wrapperClassName = "",
  id,
  required,
  ...props
}: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <label className={`flex w-full flex-col gap-2 text-left ${wrapperClassName}`}>
      {label && (
        <span className="text-sm font-medium text-cerulean">
          {label}
          {required ? <span className="text-red-600"> *</span> : null}
        </span>
      )}
      <select
        id={selectId}
        required={required}
        aria-invalid={error ? true : undefined}
        className={`block w-full min-h-[44px] rounded border bg-white px-3 py-2 text-cerulean outline-none focus:ring-1 ${
          error
            ? "border-red-400 focus:border-red-500 focus:ring-red-400/40"
            : "border-mist/40 focus:border-cerulean focus:ring-cerulean/40"
        } ${className}`}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}
