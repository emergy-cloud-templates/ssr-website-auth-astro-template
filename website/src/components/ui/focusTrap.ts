// Adapted from /common/legos/preact/ui-primitives@2.0.0 (dvk-common c651346). Owned by this project.
// Origin: app.upmatch.io - website/src/lib/focusTrap.ts. Lego ui-primitives; adapt per project, see README.md.
import { useEffect, useRef } from "preact/hooks";
import type { RefObject } from "preact";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Ordered stack of the open dialogs (pure, so it can be unit-tested). The last
 * one pushed is on top; removing works from any position, so a parent that
 * closes before its child does not corrupt the order.
 */
export function createDialogStack<T>() {
  const items: T[] = [];
  return {
    push(item: T) {
      items.push(item);
    },
    remove(item: T) {
      const index = items.lastIndexOf(item);
      if (index !== -1) items.splice(index, 1);
    },
    isTop(item: T) {
      return items.length > 0 && items[items.length - 1] === item;
    },
    size() {
      return items.length;
    },
  };
}

/** Every active trap, in opening order. Only the top one handles Tab. */
const activeTraps = createDialogStack<RefObject<HTMLElement>>();

/**
 * True when `ref` is the most recently opened active focus trap. Escape
 * handlers check it so Escape in a nested dialog closes only that dialog.
 */
export function isTopmostDialog(ref: RefObject<HTMLElement>): boolean {
  return activeTraps.isTop(ref);
}

/**
 * Keeps Tab/Shift+Tab cycling inside the referenced container while `active`.
 * Attach the returned ref to the dialog/drawer root. Focus restoration on
 * close stays the caller's responsibility. With nested dialogs only the
 * topmost trap acts, so the inner dialog keeps the focus.
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!active) return;
    activeTraps.push(ref);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (!activeTraps.isTop(ref)) return;
      const node = ref.current;
      if (!node) return;
      const focusables = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0,
      );
      if (focusables.length === 0) {
        e.preventDefault();
        node.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const current = document.activeElement as HTMLElement | null;
      if (!current || !node.contains(current) || current === node) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }
      if (e.shiftKey && current === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && current === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      activeTraps.remove(ref);
    };
  }, [active]);

  return ref;
}
