// Adapted from /common/legos/preact/ui-primitives@2.0.0 (dvk-common c651346). Owned by this project.
// Origin: app.upmatch.io - website/src/components/ui/CopyButton.tsx. Lego ui-primitives; adapt per project, see README.md.
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { Button } from "./Button";

/**
 * Copies text to the clipboard. `copied` stays true for `resetMs` after a
 * successful copy (for a "Copied" label); `copy` resolves to false when the
 * clipboard is unavailable or refused.
 */
export function useCopyToClipboard(resetMs = 1500) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        return false;
      }
      setCopied(true);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCopied(false), resetMs);
      return true;
    },
    [resetMs],
  );

  return { copied, copy };
}

const iconClass = "h-3.5 w-3.5 shrink-0";

/** Small "Copy" button (a copy icon, then a tick) that copies `text` and says "Copied" for a moment. */
export function CopyButton({
  text,
  label = "Copy",
  copiedLabel = "Copied",
}: {
  text: string;
  label?: string;
  copiedLabel?: string;
}) {
  const { copied, copy } = useCopyToClipboard();
  return (
    <Button variant="outline" size="sm" class="!px-2.5 !py-1 !text-xs" onClick={() => void copy(text)}>
      <span class="inline-flex items-center gap-1.5" aria-live="polite">
        {copied ? (
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class={iconClass}
          >
            <path d="M4 10.5l4 4 8-9" />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linejoin="round"
            class={iconClass}
          >
            <rect x="7" y="7" width="10" height="10" rx="2" />
            <path d="M13 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
          </svg>
        )}
        {copied ? copiedLabel : label}
      </span>
    </Button>
  );
}
