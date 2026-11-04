// Adapted from /common/legos/preact/ui-primitives@2.0.0 (dvk-common c651346). Owned by this project.
// Origin: app.upmatch.io - website/src/components/ui/StatCard.tsx. Lego ui-primitives; adapt per project, see README.md.
interface StatCardProps {
  title: string;
  /** `null` = no data: shows `emptyLabel` (and `emptyHint`) instead of a number. */
  value: string | number | null;
  subtitle?: string;
  icon?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  /** A good (success) or bad (error) number: coloured value and a left accent. */
  variant?: "success" | "error";
  /** Shown instead of the value when it is `null` (default "-"). */
  emptyLabel?: string;
  /** Short explanation under an empty value, e.g. how to get the data. */
  emptyHint?: string;
  /** The value is still loading: shows a placeholder. */
  loading?: boolean;
  /** Tighter padding and a smaller value, for rows of many tiles. */
  compact?: boolean;
  /** Makes the tile a button (a tile that switches what the page shows). */
  onClick?: () => void;
  /** With `onClick`: the tile is the one chosen (brand ring, `aria-pressed`). */
  selected?: boolean;
}

const variantStyles = {
  success: { card: "border-l-4 border-l-status-success", value: "text-status-success-content" },
  error: { card: "border-l-4 border-l-status-error", value: "text-status-error-content" },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant,
  emptyLabel = "-",
  emptyHint,
  loading,
  compact,
  onClick,
  selected,
}: StatCardProps) {
  const accent = variant ? variantStyles[variant] : null;
  const isEmpty = !loading && value === null;
  const box = `bg-surface-raised rounded-[var(--radius-card)] shadow-card border ${compact ? "p-4" : "p-6"} ${accent?.card ?? ""}`;
  const body = (
    <>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className={`${compact ? "text-xs" : "text-sm"} font-medium text-content-muted`}>{title}</p>
          {loading ? (
            <p className={`mt-1 ${compact ? "text-xl" : "text-2xl"} font-bold text-content-light`}>…</p>
          ) : isEmpty ? (
            <p className="mt-1 text-sm font-semibold text-content-muted">{emptyLabel}</p>
          ) : (
            <p
              className={`mt-1 ${compact ? "text-xl" : "text-2xl"} font-bold tabular-nums ${accent?.value ?? "text-content"}`}
            >
              {value}
            </p>
          )}
          {!isEmpty && !loading && subtitle && <p className="mt-1 text-xs text-content-muted">{subtitle}</p>}
          {isEmpty && emptyHint && <p className="mt-1.5 text-xs leading-snug text-content-muted">{emptyHint}</p>}
          {trend && (
            <p
              className={`mt-2 text-sm ${trend.isPositive ? "text-status-success-content" : "text-status-error-content"}`}
            >
              {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        {icon && (
          <span aria-hidden="true" className="text-3xl">
            {icon}
          </span>
        )}
      </div>
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={Boolean(selected)}
        className={`${box} w-full cursor-pointer text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
          selected ? "border-primary ring-2 ring-primary" : "border-line-subtle hover:border-primary/40"
        }`}
      >
        {body}
      </button>
    );
  }
  return <div className={`${box} border-line-subtle`}>{body}</div>;
}
