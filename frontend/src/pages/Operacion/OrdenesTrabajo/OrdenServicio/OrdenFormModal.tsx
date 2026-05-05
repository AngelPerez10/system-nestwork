import { ReactNode } from "react";
import { Modal } from "@/components/ui/modal";

interface OrdenFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  closeOnEscape: boolean;
  sectionLabel: string;
  title: string;
  subtitle: string;
  formRef: React.RefObject<HTMLFormElement | null>;
  onSubmit: (e: React.FormEvent) => void;
  children: ReactNode;
}

export function OrdenFormModal({
  isOpen,
  onClose,
  closeOnEscape,
  sectionLabel,
  title,
  subtitle,
  formRef,
  onSubmit,
  children,
}: OrdenFormModalProps) {
  return (
    <Modal
      mobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      closeOnBackdropClick={false}
      closeOnEscape={closeOnEscape}
      className="w-[94vw] max-h-[92vh] max-w-4xl overflow-hidden rounded-2xl border border-[#e7ded0] bg-[#fffdfa] p-0 dark:border-[#273244] dark:bg-[#111a2b]"
    >
      <div>
        <header className="relative shrink-0 border-b border-[#e7ded0] bg-[#fcfaf6] px-6 py-5 pr-14 dark:border-[#334155] dark:bg-[#111827] sm:pr-16">
          <div className="pointer-events-none absolute left-0 top-0 h-0.5 w-full bg-[#ff801f]" aria-hidden />
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ff801f] text-black shadow-sm">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#78716c] dark:text-[#8ea0b8] sm:text-xs">{sectionLabel}</p>
              <h3 className="[font-family:Georgia,'Times_New_Roman',serif] mt-1 text-[clamp(1.4rem,2vw,2rem)] font-medium leading-[1.2] text-gray-900 dark:text-white">
                {title}
              </h3>
              <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">{subtitle}</p>
            </div>
          </div>
        </header>

        <form
          ref={formRef}
          onSubmit={onSubmit}
          className="custom-scrollbar max-h-[80vh] space-y-5 overflow-y-auto bg-[#fffdfa] p-4 dark:bg-[#111a2b] sm:p-5"
        >
          {children}
        </form>
      </div>
    </Modal>
  );
}
