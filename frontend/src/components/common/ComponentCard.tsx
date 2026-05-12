interface ComponentCardProps {
  title: string;
  children: React.ReactNode;
  className?: string; // Additional custom classes for styling
  desc?: string; // Description text
  actions?: React.ReactNode;
  /** Tipografía y espaciado más contenidos en viewport pequeño (p. ej. formularios largos en móvil) */
  compact?: boolean;
}

const ComponentCard: React.FC<ComponentCardProps> = ({
  title,
  children,
  className = "",
  desc = "",
  actions,
  compact = false,
}) => {
  return (
    <div
      className={`rounded-3xl border border-gray-200 bg-white text-gray-900 shadow-sm dark:border-[#d6ebfd]/20 dark:bg-[#000000] dark:text-[#f0f0f0] dark:shadow-[rgba(176,199,217,0.145)_0px_0px_0px_1px] ${className}`}
    >
      {/* Card Header */}
      <div
        className={
          compact
            ? "px-4 py-3.5 sm:px-6 sm:py-5"
            : "px-6 py-5"
        }
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <h3
            className={
              compact
                ? "min-w-0 flex-1 text-sm font-semibold tracking-tight text-gray-900 sm:text-base sm:font-medium sm:tracking-normal dark:text-[#f0f0f0]"
                : "min-w-0 flex-1 text-base font-medium text-gray-900 dark:text-[#f0f0f0]"
            }
          >
            {title}
          </h3>
          {actions ? <div className="w-full shrink-0 sm:w-auto sm:max-w-[min(100%,20rem)]">{actions}</div> : null}
        </div>
        {desc && (
          <p
            className={
              compact
                ? "mt-1 text-xs leading-relaxed text-gray-500 dark:text-[#a1a4a5] sm:text-sm"
                : "mt-1 text-sm text-gray-500 dark:text-[#a1a4a5]"
            }
          >
            {desc}
          </p>
        )}
      </div>

      {/* Card Body */}
      <div
        className={
          compact
            ? "space-y-0 border-t border-gray-100 p-3 dark:border-[#d6ebfd]/20 sm:p-6"
            : "border-t border-gray-100 p-4 dark:border-[#d6ebfd]/20 sm:p-6"
        }
      >
        <div className={compact ? "space-y-4 sm:space-y-6" : "space-y-6"}>{children}</div>
      </div>
    </div>
  );
};

export default ComponentCard;
