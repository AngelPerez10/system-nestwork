import type React from "react";
import type { FC } from "react";

interface InputProps {
  type?: "text" | "number" | "email" | "password" | "date" | "time" | string;
  id?: string;
  name?: string;
  placeholder?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  min?: string;
  max?: string;
  step?: number;
  disabled?: boolean;
  required?: boolean;
  success?: boolean;
  error?: boolean;
  hint?: string;
}

const Input: FC<InputProps> = ({
  type = "text",
  id,
  name,
  placeholder,
  value,
  onChange,
  className = "",
  min,
  max,
  step,
  disabled = false,
  required = false,
  success = false,
  error = false,
  hint,
}) => {
  let inputClasses = `h-11 w-full rounded-xl border appearance-none border-[#e2d9ca] bg-white px-4 py-2.5 text-sm text-[#1c1917] placeholder:text-[#78716c] shadow-none focus:outline-hidden focus:ring-2 focus:ring-[#ff801f]/20 dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb] dark:placeholder:text-[#8ea0b8] dark:focus:border-[#fb923c] dark:focus:ring-[#fb923c]/20 ${className}`;

  if (disabled) {
    inputClasses += ` border-gray-200 bg-gray-100 text-gray-500 opacity-50 cursor-not-allowed dark:border-[#334155]/50 dark:bg-[#111a2b]/70 dark:text-[#94a3b8]`;
  } else if (error) {
    inputClasses += ` border-error-500 focus:border-error-500 focus:ring-error-500/25`;
  } else if (success) {
    inputClasses += ` border-success-500 focus:border-success-500 focus:ring-success-500/25`;
  } else {
    inputClasses += ` focus:border-[#ff801f]`;
  }

  return (
    <div className="relative">
      <input
        type={type}
        id={id}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        required={required}
        className={inputClasses}
      />

      {hint && (
        <p
          className={`mt-1.5 text-xs ${
            error
              ? "text-error-500"
              : success
              ? "text-success-500"
              : "text-gray-500 dark:text-[#a1a4a5]"
          }`}
        >
          {hint}
        </p>
      )}
    </div>
  );
};

export default Input;
