// Adapted from /common/legos/preact/ui-primitives@2.0.0 (dvk-common c651346). Owned by this project.
// Origin: app.upmatch.io - website/src/components/ui/Toast.tsx. Lego ui-primitives; adapt per project, see README.md.
import { useEffect, useRef } from "preact/hooks";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastMessage {
  type: ToastType;
  text: string;
}

/** Auto-dismiss duration for transient toasts. */
export const TOAST_DURATION_MS = 4500;

type SetToastMessage = (value: ToastMessage | null | ((prev: ToastMessage | null) => ToastMessage | null)) => void;

/**
 * Clears transient toasts (success/info by default) after {@link TOAST_DURATION_MS};
 * error/warning toasts stay until dismissed.
 */
export function useAutoDismissToast(
  message: ToastMessage | null,
  setMessage: SetToastMessage,
  opts: { durationMs?: number; dismissTypes?: ToastType[] } = {},
): void {
  const { durationMs = TOAST_DURATION_MS, dismissTypes = ["success", "info"] } = opts;
  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (message && dismissTypes.includes(message.type)) {
      const type = message.type;
      timerRef.current = window.setTimeout(() => {
        setMessage((cur) => (cur?.type === type ? null : cur));
      }, durationMs);
    }
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [message, setMessage, durationMs]);
}

const toastStyles: Record<ToastType, string> = {
  success: "bg-status-success-bg text-status-success-content border-status-success/30",
  error: "bg-status-error-bg text-status-error-content border-status-error/30",
  info: "bg-status-info-bg text-status-info-content border-status-info/30",
  warning: "bg-status-warning-bg text-status-warning-content border-status-warning/30",
};

export interface ToastProps {
  message: ToastMessage | null;
  onDismiss: () => void;
}

/** Fixed bottom-right toast. Pair with {@link useAutoDismissToast}. */
export function Toast({ message, onDismiss }: ToastProps) {
  return (
    <div aria-live="polite" aria-atomic="true" class={message ? undefined : "sr-only"}>
      {message && (
        <div class="fixed bottom-4 right-4 z-50 flex max-w-sm items-start gap-3">
          <div
            role={message.type === "error" ? "alert" : "status"}
            class={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm font-medium shadow-card ${toastStyles[message.type]}`}
          >
            <span class="flex-1">{message.text}</span>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss notification"
              class="cursor-pointer leading-none opacity-70 transition-opacity hover:opacity-100"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
