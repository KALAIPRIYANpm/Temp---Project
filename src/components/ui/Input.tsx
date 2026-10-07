import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  wrapperClassName?: string;
}

export function Input({
  label,
  error,
  className = "",
  wrapperClassName = "",
  id,
  required,
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  const field = (
    <input
      id={inputId}
      required={required}
      aria-invalid={error ? true : undefined}
      className={`block w-full min-h-[44px] rounded border bg-white px-3 py-2 text-cerulean outline-none placeholder:text-mist/80 focus:ring-1 ${
        error
          ? "border-red-400 focus:border-red-500 focus:ring-red-400/40"
          : "border-mist/40 focus:border-cerulean focus:ring-cerulean/40"
      } ${className}`}
      {...props}
    />
  );

  if (!label) {
    return (
      <div className={`w-full ${wrapperClassName}`}>
        {field}
        {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
      </div>
    );
  }

  return (
    <label className={`flex w-full flex-col gap-2 text-left ${wrapperClassName}`}>
      <span className="text-sm font-medium text-cerulean">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </span>
      {field}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}
