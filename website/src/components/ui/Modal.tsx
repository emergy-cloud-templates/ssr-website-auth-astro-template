// Adapted from /common/legos/preact/ui-primitives@2.0.0 (dvk-common c651346). Owned by this project.
// Origin: app.upmatch.io - website/src/components/ui/Modal.tsx. Lego ui-primitives; adapt per project, see README.md.
import type { ComponentChildren } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { createPortal } from "preact/compat";
import { isTopmostDialog, useFocusTrap } from "./focusTrap";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ComponentChildren;
  /** Optional sticky footer area (e.g. action buttons). */
  footer?: ComponentChildren;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  /**
   * Stack above another overlay. The default z-50 sits below the hand-rolled
   * `z-[60]` overlays (e.g. ApplicationDetailModal), so a Modal opened from
   * inside one needs this to be visible.
   */
  elevated?: boolean;
  /** CSS selector of the element to focus on open (default: the dialog itself). */
  initialFocus?: string;
}

const sizeStyles = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  "2xl": "max-w-6xl",
  full: "max-w-[95vw]",
};

const TITLE_ID = "modal-title";

export function Modal({ isOpen, onClose, title, children, footer, size = "md", elevated, initialFocus }: ModalProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const dialogRef = useFocusTrap<HTMLDivElement>(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement;
    requestAnimationFrame(() => {
      const target = initialFocus ? dialogRef.current?.querySelector<HTMLElement>(initialFocus) : null;
      (target ?? dialogRef.current)?.focus();
    });
    const handleEscape = (e: KeyboardEvent) => {
      // Only the topmost dialog closes, so Escape in a nested one leaves its parent open.
      if (e.key === "Escape" && isTopmostDialog(dialogRef)) onCloseRef.current();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
      previousFocusRef.current?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Portal to <body>: ancestors with backdrop-filter/transform (e.g. the
  // sticky settings toolbar) become the containing block for position:fixed
  // and would clip the overlay.
  return createPortal(
    <div className={`fixed inset-0 ${elevated ? "z-[70]" : "z-50"} overflow-y-auto overscroll-contain`}>
      <div className="flex min-h-screen items-center justify-center p-4">
        <div aria-hidden="true" className="fixed inset-0 bg-overlay transition-opacity" onClick={onClose} />

        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? TITLE_ID : undefined}
          aria-label={title ? undefined : "Dialog"}
          tabIndex={-1}
          className={`relative w-full rounded-[var(--radius-card)] bg-surface-raised shadow-xl ${sizeStyles[size]}`}
        >
          {title && (
            <div className="flex items-center justify-between border-b border-line-subtle px-6 py-4">
              <h3 id={TITLE_ID} className="text-lg font-semibold text-content">
                {title}
              </h3>
              <button
                onClick={onClose}
                aria-label="Close"
                className="cursor-pointer text-content-light transition-colors hover:text-content-secondary"
              >
                <svg aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          <div className="p-6">{children}</div>
          {footer && (
            <div className="flex items-center justify-end gap-2 border-t border-line-subtle px-6 py-4">{footer}</div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
