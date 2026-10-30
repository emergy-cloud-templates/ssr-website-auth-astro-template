// Adapted from /common/legos/preact/ui-primitives@2.0.0 (dvk-common c651346). Owned by this project.
// Origin: app.upmatch.io - website/src/components/ui/ConfirmDialog.tsx. Lego ui-primitives; adapt per project, see README.md.
import type { ComponentChildren } from "preact";
import { Alert } from "./Alert";
import { Button } from "./Button";
import { Modal } from "./Modal";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  /** What will happen if the user confirms. */
  children?: ComponentChildren;
  confirmLabel?: string;
  /** Confirm button text while `busy` (default: `confirmLabel`). */
  busyLabel?: string;
  cancelLabel?: string;
  /** `danger` for destructive actions. */
  variant?: "primary" | "danger";
  /** The action is running: both buttons are disabled and the dialog cannot be closed. */
  busy?: boolean;
  /** Confirm button disabled, e.g. until a typed confirmation matches. */
  confirmDisabled?: boolean;
  /** Shown above the buttons, e.g. when the action failed. */
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * "Are you sure?" dialog built on Modal (focus trap, Escape, backdrop click).
 * For a plain yes / no, `window.confirm` is still fine; use this when the
 * question needs explanation, an input or an error state.
 */
export function ConfirmDialog({
  isOpen,
  title,
  children,
  confirmLabel = "Confirm",
  busyLabel,
  cancelLabel = "Cancel",
  variant = "primary",
  busy = false,
  confirmDisabled = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancel = () => {
    if (!busy) onCancel();
  };
  return (
    <Modal
      isOpen={isOpen}
      onClose={cancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={cancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={onConfirm} disabled={busy || confirmDisabled} loading={busy}>
            {busy && busyLabel ? busyLabel : confirmLabel}
          </Button>
        </>
      }
    >
      {children}
      {error && <Alert type="error" message={error} className="mt-3" />}
    </Modal>
  );
}
