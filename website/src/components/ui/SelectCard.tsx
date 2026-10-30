// Adapted from /common/legos/preact/ui-primitives@2.0.0 (dvk-common c651346). Owned by this project.
// Origin: app.upmatch.io - website/src/components/ui/SelectCard.tsx. Lego ui-primitives; adapt per project, see README.md.
import type { ComponentChildren } from "preact";

interface SelectCardProps {
  selected: boolean;
  onToggle: () => void;
  /** Not selectable now (e.g. the pick is full); a selected card can always be unselected. */
  disabled?: boolean;
  /** Accessible name, when the content does not say it plainly. */
  label?: string;
  /** Hover hint (e.g. why it is disabled). */
  title?: string;
  class?: string;
  children: ComponentChildren;
}

/**
 * A card the user clicks to select or unselect (a checkbox shaped like a
 * card), laid out as a row: the tick on the left, the content after it.
 * Selected = the brand gradient (as the report's hero) with white text and a
 * deeper shadow; unselected = white with a soft shadow. The card is a Tailwind
 * `group`: content colours itself with `group-aria-checked:` (e.g.
 * `text-content group-aria-checked:text-on-primary`). Links and buttons inside
 * keep working without toggling it; Space / Enter toggle it.
 */
export function SelectCard({
  selected,
  onToggle,
  disabled = false,
  label,
  title,
  class: className = "",
  children,
}: SelectCardProps) {
  const toggle = () => {
    if (!disabled) onToggle();
  };
  return (
    <div
      role="checkbox"
      aria-checked={selected}
      aria-disabled={disabled || undefined}
      aria-label={label}
      title={title}
      tabIndex={disabled ? -1 : 0}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a, button")) return;
        toggle();
      }}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget || (e.key !== " " && e.key !== "Enter")) return;
        e.preventDefault();
        toggle();
      }}
      class={`group flex items-center gap-4 rounded-[var(--radius-card)] border px-5 py-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 ${
        selected
          ? "border-transparent bg-gradient-brand text-on-primary shadow-card-hover"
          : `border-line-subtle bg-surface-raised text-content shadow-card ${disabled ? "" : "hover:-translate-y-px hover:border-primary/30 hover:shadow-card-hover"}`
      } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${className}`}
    >
      <span
        aria-hidden="true"
        class={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
          selected
            ? "bg-on-primary text-primary shadow-sm"
            : "border-2 border-line-strong bg-surface-raised text-transparent group-hover:border-primary/50"
        }`}
      >
        ✓
      </span>
      <div class="min-w-0 flex-1">{children}</div>
    </div>
  );
}
