import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-cerulean text-white hover:bg-cerulean/90 active:bg-cerulean border border-transparent",
  secondary:
    "bg-white text-cerulean border border-cerulean hover:bg-morning/50 active:bg-morning",
  ghost: "bg-transparent text-mist hover:bg-morning/40 hover:text-cerulean",
  danger: "bg-red-600 text-white hover:bg-red-700",
  outline:
    "bg-white border border-mist/50 text-cerulean hover:bg-morning/40 hover:border-mist",
};

const sizes = {
  sm: "px-3 py-2 text-sm rounded min-h-[40px]",
  md: "px-4 py-2.5 text-sm rounded min-h-[44px]",
  lg: "px-5 py-3 text-base rounded min-h-[48px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "primary", size = "md", className = "", children, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        className={`touch-target inline-flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  },
);
