import type { InputHTMLAttributes } from "react";
import { Input } from "./Input";

interface RollNumberInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "inputMode" | "onChange" | "value"> {
  label?: string;
  error?: string;
  wrapperClassName?: string;
  value: string;
  onChange: (value: string) => void;
}

/** Numeric roll number field — digits only, opens number keypad on mobile. */
export function RollNumberInput({
  label = "Roll number",
  error,
  value,
  onChange,
  placeholder = "e.g. 003",
  ...props
}: RollNumberInputProps) {
  return (
    <Input
      label={label}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
      error={error}
      {...props}
    />
  );
}
