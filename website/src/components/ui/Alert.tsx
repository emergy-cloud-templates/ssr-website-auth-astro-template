// Adapted from /common/legos/preact/ui-primitives@2.0.0 (dvk-common c651346). Owned by this project.
// Origin: app.upmatch.io - website/src/components/ui/Alert.tsx. Lego ui-primitives; adapt per project, see README.md.
import type { ComponentChildren } from "preact";

type AlertType = "success" | "error" | "warning" | "info";

interface AlertProps {
  type: AlertType;
  /** Short message. Provide either `message` or `children`. */
  message?: string;
  title?: string;
  children?: ComponentChildren;
  onDismiss?: () => void;
  className?: string;
}

const styles: Record<AlertType, string> = {
  success: "bg-status-success-bg border-status-success/30 text-status-success-content",
  error: "bg-status-error-bg border-status-error/30 text-status-error-content",
  warning: "bg-status-warning-bg border-status-warning/40 text-status-warning-content",
  info: "bg-status-info-bg border-status-info/30 text-status-info-content",
};

const icons: Record<AlertType, string> = {
  success: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  error: "M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z",
  warning:
    "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z",
  info: "m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z",
};

export function Alert({ type, message, title, children, onDismiss, className = "" }: AlertProps) {
  const role = type === "error" ? "alert" : "status";
  const ariaLive = type === "error" ? undefined : ("polite" as const);

  return (
    <div
      role={role}
      aria-live={ariaLive}
      class={`flex items-start gap-3 rounded-lg border p-4 text-sm ${styles[type]} ${className}`}
    >
      <svg aria-hidden="true" class="mt-0.5 h-5 w-5 flex-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d={icons[type]} />
      </svg>
      <div class="flex-1">
        {title && <p class="font-semibold">{title}</p>}
        {message && <p class={title ? "mt-0.5 opacity-90" : ""}>{message}</p>}
        {children}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          class="cursor-pointer leading-none opacity-70 transition-opacity hover:opacity-100"
        >
          ×
        </button>
      )}
    </div>
  );
}
