// Adapted from /common/legos/node/api-route@1.0.0 (dvk-common 33220c4). Owned by this project.
// The server half of the data-table lego's server mode: parse `?search=&sort=&page=&size=&<filter>=` (the
// parameters data-table's requestParams sends) into a query a route can run, and answer `{ rows, total }`.
// Lego api-route; adapt per project, see README.md.
import { json } from "./http.ts";

export interface ListQuery {
  /** Trimmed search text ("" when none). */
  search: string;
  /** Only keys listed in `sortable`; null when none was asked (use your default order). */
  sort: { key: string; dir: "asc" | "desc" } | null;
  /** 0-based page and its size, clamped to `maxPageSize`; `offset` = page * pageSize (for `.range()` / LIMIT). */
  page: number;
  pageSize: number;
  offset: number;
  /** Only keys listed in `filters`, with their raw value ("1" for a toggle). */
  filters: Record<string, string>;
}

export interface ListQueryOptions {
  sortable?: readonly string[];
  filters?: readonly string[];
  defaultPageSize?: number;
  maxPageSize?: number;
  /** Longest search accepted (longer is cut). */
  maxSearch?: number;
}

const positive = (v: string | null) => (v && /^\d+$/.test(v) ? Number(v) : NaN);

/** Never throws: an unknown sort key, a filter not listed or a bad page number is ignored. */
export function parseListQuery(url: URL, options: ListQueryOptions = {}): ListQuery {
  const p = url.searchParams;
  const maxPageSize = options.maxPageSize ?? 100;
  const search = (p.get("search") ?? "").trim().slice(0, options.maxSearch ?? 200);
  const rawSort = p.get("sort") ?? "";
  const desc = rawSort.startsWith("-");
  const key = desc ? rawSort.slice(1) : rawSort;
  const sort =
    key && (options.sortable ?? []).includes(key) ? { key, dir: desc ? ("desc" as const) : ("asc" as const) } : null;
  const pageNumber = positive(p.get("page"));
  const page = Number.isFinite(pageNumber) && pageNumber >= 1 ? Math.min(pageNumber - 1, 1_000_000) : 0;
  const size = positive(p.get("size"));
  const pageSize =
    Number.isFinite(size) && size >= 1
      ? Math.min(size, maxPageSize)
      : Math.min(options.defaultPageSize ?? 25, maxPageSize);
  const filters: Record<string, string> = {};
  for (const f of options.filters ?? []) {
    const v = p.get(f);
    if (v !== null && v !== "") filters[f] = v;
  }
  return { search, sort, page, pageSize, offset: page * pageSize, filters };
}

/** The answer data-table's fetchLoader reads by default. */
export function listResponse<Row>(rows: Row[], total: number): Response {
  return json({ rows, total });
}
