import { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode; // Button text or content
  type?: "button" | "submit" | "reset";
  size?: "sm" | "md"; // Button size
  variant?: "primary" | "outline"; // Button variant
  startIcon?: ReactNode; // Icon before the text
  endIcon?: ReactNode; // Icon after the text
  onClick?: () => void; // Click handler
  disabled?: boolean; // Disabled state
  className?: string; // Disabled state
}

const Button: React.FC<ButtonProps> = ({
  children,
  type = "button",
  size = "md",
  variant = "primary",
  startIcon,
  endIcon,
  onClick,
  className = "",
  disabled = false,
}) => {
  // Size Classes
  const sizeClasses = {
    sm: "px-4 py-2 text-sm",
    md: "px-5 py-2.5 text-sm",
  };

  // Variant Classes
  const variantClasses = {
    primary:
      "bg-black text-white border border-gray-300 hover:bg-black/85 disabled:bg-black/40 dark:bg-white dark:text-black dark:border-[#d6ebfd]/20 dark:hover:bg-[#f0f0f0]",
    outline:
      "bg-white text-gray-700 border border-gray-300 hover:bg-black/[0.04] dark:bg-transparent dark:text-[#f0f0f0] dark:border-[#d6ebfd]/20 dark:hover:bg-white/10",
  };

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-full transition ${className} ${
        sizeClasses[size]
      } ${variantClasses[variant]} ${
        disabled ? "cursor-not-allowed opacity-50" : ""
      }`}
      onClick={onClick}
      disabled={disabled}
    >
      {startIcon && <span className="flex items-center">{startIcon}</span>}
      {children}
      {endIcon && <span className="flex items-center">{endIcon}</span>}
    </button>
  );
};

export default Button;
