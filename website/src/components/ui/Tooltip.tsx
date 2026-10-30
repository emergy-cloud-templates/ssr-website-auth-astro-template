// Adapted from /common/legos/preact/ui-primitives@2.0.0 (dvk-common c651346). Owned by this project.
// Origin: app.upmatch.io - website/src/components/ui/Tooltip.tsx. Lego ui-primitives; adapt per project, see README.md.
import { cloneElement, isValidElement, type ComponentChildren, type VNode } from "preact";
import { useFieldId } from "./fieldId";

interface TooltipProps {
  /** Tooltip text shown on hover / keyboard focus. */
  label: string;
  /** The trigger element the tooltip describes. */
  children: ComponentChildren;
  /** Where the bubble appears relative to the trigger. Default "top". */
  position?: "top" | "bottom";
  /**
   * Horizontal anchoring of the bubble. Default "center". Use "right" when the
   * trigger sits near the right edge of the page so the bubble opens inward
   * instead of overflowing (which would create horizontal scroll); "left" near
   * the left edge.
   */
  align?: "center" | "right" | "left";
  class?: string;
}

/**
 * Small reusable, custom-styled tooltip. Pure CSS (hover + focus-within), no JS
 * state - wrap a trigger and pass a `label`. Used for the upgrade hints on
 * locked features. Accessible: the bubble shows when the trigger has focus, and
 * the trigger is described by it (aria-describedby). The trigger must be
 * focusable itself (a button or a link) for keyboard users; the wrapper adds no
 * tab stop of its own.
 */
export function Tooltip({ label, children, position = "top", align = "center", class: className = "" }: TooltipProps) {
  const bubbleId = useFieldId();
  const trigger = isValidElement(children)
    ? cloneElement(children as VNode<Record<string, unknown>>, { "aria-describedby": bubbleId })
    : children;
  return (
    <span class={`tt-wrap tt-align-${align} ${className}`}>
      {trigger}
      <span id={bubbleId} class={`tt-bubble tt-${position}`} role="tooltip">
        {label}
      </span>
      <style>{`
        .tt-wrap {
          position: relative;
          display: inline-flex;
          align-items: center;
          outline: none;
        }
        .tt-bubble {
          position: absolute;
          z-index: 50;
          width: max-content;
          max-width: 240px;
          padding: 7px 10px;
          border-radius: 8px;
          background: var(--color-inverse);
          color: var(--color-on-inverse);
          font-size: 12px;
          font-weight: 500;
          line-height: 1.4;
          text-align: center;
          /* Reset, so a nowrap trigger (e.g. a pill/chip) can't force the label
             onto one unwrappable line that overflows max-width. */
          white-space: normal;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.12s ease, transform 0.12s ease;
        }
        /* Horizontal anchoring - "right"/"left" keep the bubble from overflowing
           the viewport at page edges (which would trigger horizontal scroll). */
        .tt-align-center .tt-bubble { left: 50%; transform: translateX(-50%) translateY(4px); }
        .tt-align-right .tt-bubble { right: 0; transform: translateY(4px); }
        .tt-align-left .tt-bubble { left: 0; transform: translateY(4px); }
        .tt-top { bottom: 100%; margin-bottom: 8px; }
        .tt-bottom { top: 100%; margin-top: 8px; }
        .tt-bubble::after {
          content: "";
          position: absolute;
          border: 5px solid transparent;
        }
        .tt-align-center .tt-bubble::after { left: 50%; transform: translateX(-50%); }
        .tt-align-right .tt-bubble::after { right: 12px; }
        .tt-align-left .tt-bubble::after { left: 12px; }
        .tt-top::after { top: 100%; border-top-color: var(--color-inverse); }
        .tt-bottom::after { bottom: 100%; border-bottom-color: var(--color-inverse); }
        .tt-align-center:hover .tt-bubble,
        .tt-align-center:focus-visible .tt-bubble,
        .tt-align-center:focus-within .tt-bubble {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
        .tt-align-right:hover .tt-bubble,
        .tt-align-right:focus-visible .tt-bubble,
        .tt-align-right:focus-within .tt-bubble {
          opacity: 1;
          transform: translateY(0);
        }
        .tt-align-left:hover .tt-bubble,
        .tt-align-left:focus-visible .tt-bubble,
        .tt-align-left:focus-within .tt-bubble {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </span>
  );
}
