import { useRef, useEffect, useId } from "react";
import { FocusTrap } from "focus-trap-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  isFullscreen?: boolean;
  closeOnBackdropClick?: boolean;
  /** When false, Escape does not call onClose (useful when stacking modals). Default true. */
  closeOnEscape?: boolean;
  /** Align modal to bottom on mobile, center on >= sm. */
  mobileBottomSheet?: boolean;
  /** Accessible label for the dialog. Required if no ariaLabelledBy. */
  ariaLabel?: string;
  /** ID of the element that labels the dialog (e.g. a heading). Preferred over ariaLabel. */
  ariaLabelledBy?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  className,
  showCloseButton = true,
  isFullscreen = false,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  mobileBottomSheet = false,
  ariaLabel,
  ariaLabelledBy,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  // Save the element that had focus before the modal opened
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }
  }, [isOpen]);

  // Handle Escape key separately from focus trap
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose, closeOnEscape]);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const contentClasses = isFullscreen
    ? "w-full h-full"
    : "relative flex min-h-0 w-full flex-col rounded-3xl border border-gray-200 bg-white text-gray-900 dark:border-[#d6ebfd]/20 dark:bg-black dark:text-[#f0f0f0]";

  // Resolve aria-labelledby: explicit prop > auto-generated title ID
  const resolvedLabelledBy = ariaLabelledBy ?? (ariaLabel ? undefined : titleId);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      aria-labelledby={resolvedLabelledBy}
      className={`fixed inset-0 flex justify-center overflow-y-auto modal z-99999 ${mobileBottomSheet ? "items-end sm:items-center" : "items-center"}`}
    >
      {/* Backdrop */}
      {!isFullscreen && (
        <div
          className="fixed inset-0 h-full w-full bg-black/55 backdrop-blur-[10px]"
          onClick={closeOnBackdropClick ? onClose : undefined}
          aria-hidden="true"
        />
      )}

      {/* Focus trap wraps the actual modal content */}
      <FocusTrap
        active
        focusTrapOptions={{
          initialFocus: () => {
            // Find the first focusable element inside the modal
            const el = modalRef.current?.querySelector<HTMLElement>(
              'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            return el ?? modalRef.current!;
          },
          fallbackFocus: () => modalRef.current!,
          // Don't let focus trap handle Escape — we handle it ourselves
          escapeDeactivates: false,
          // Don't close on deactivate — prevents auto-close when trap loses focus
          returnFocusOnDeactivate: false,
          allowOutsideClick: true,
        }}
      >
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- focus-trap-react handles keyboard; stopPropagation is defensive */}
        <div
          ref={modalRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          className={`${contentClasses} ${className}`}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="absolute right-3 top-3 z-999 flex h-9.5 w-9.5 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-500 transition-colors hover:bg-black/[0.04] hover:text-black dark:border-[#d6ebfd]/20 dark:bg-transparent dark:text-[#a1a4a5] dark:hover:bg-white/10 dark:hover:text-[#f0f0f0] sm:right-6 sm:top-6 sm:h-11 sm:w-11"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.04289 16.5413C5.65237 16.9318 5.65237 17.565 6.04289 17.9555C6.43342 18.346 7.06658 18.346 7.45711 17.9555L11.9987 13.4139L16.5408 17.956C16.9313 18.3466 17.5645 18.3466 17.955 17.956C18.3455 17.5655 18.3455 16.9323 17.955 16.5418L13.4129 11.9997L17.955 7.4576C18.3455 7.06707 18.3455 6.43391 17.955 6.04338C17.5645 5.65286 16.9313 5.65286 16.5408 6.04338L11.9987 10.5855L7.45711 6.0439C7.06658 5.65338 6.43342 5.65338 6.04289 6.0439C5.65237 6.43442 5.65237 7.06759 6.04289 7.45811L10.5845 11.9997L6.04289 16.5413Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          )}
          <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">{children}</div>
        </div>
      </FocusTrap>
    </div>
  );
};
