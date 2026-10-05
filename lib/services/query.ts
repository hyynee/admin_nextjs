import type { ListParams, ListResult, SortDirection } from "@/types";

/** Simulated network latency so loading states are actually visible. */
export function delay(ms = 180): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Structured clone so callers can never mutate the in-memory store by accident. */
export function clone<T>(value: T): T {
  return structuredClone(value);
}

export function normalizeSearch(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function matchesSearch(haystack: Array<string | number | null | undefined>, needle: string): boolean {
  if (!needle) return true;
  return haystack.some((value) =>
    value === null || value === undefined
      ? false
      : String(value).toLowerCase().includes(needle),
  );
}

/**
 * Case-insensitive comparator. Returns 0 for equal values so ties keep a
 * stable order (see the `id` tiebreaker below) and pagination cannot repeat or
 * skip rows between requests.
 */
export function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "en-US", { numeric: true, sensitivity: "base" });
}

/**
 * Applies search, filter, sort and pagination.
 *
 * `filter` receives the whole row so each entity can define its own semantics
 * (products match on name only, orders on code + customer, ...).
 */
export function queryList<T extends { id: string }>(
  rows: readonly T[],
  params: ListParams,
  config: {
    search?: (row: T, needle: string) => boolean;
    filter?: (row: T, filters: Record<string, string | undefined>) => boolean;
    sortValue?: (row: T, sort: string) => unknown;
    defaultSort?: string;
  } = {},
): ListResult<T> {
  const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 10;
  const page = params.page && params.page > 0 ? params.page : 1;
  const needle = normalizeSearch(params.search);
  const filters = params.filters ?? {};
  const sort = params.sort && params.sort.length > 0 ? params.sort : (config.defaultSort ?? "");
  const direction: SortDirection = params.direction === "desc" ? "desc" : "asc";
  const multiplier = direction === "desc" ? -1 : 1;

  let result = rows.filter((row) => {
    if (config.filter && !config.filter(row, filters)) return false;
    if (!needle) return true;
    // Without an entity-specific matcher, fall back to matching the id.
    return config.search ? config.search(row, needle) : row.id.toLowerCase().includes(needle);
  });

  if (sort) {
    const sortValue = config.sortValue ?? ((row: T) => (row as Record<string, unknown>)[sort]);
    result = [...result].sort((a, b) => {
      const primary = compareValues(sortValue(a, sort), sortValue(b, sort));
      // Stable tiebreaker keeps pagination deterministic.
      return primary !== 0 ? primary * multiplier : compareValues(a.id, b.id);
    });
  }

  const total = result.length;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  // Clamp so a stale `?page=99` in a shared link cannot return an empty table.
  const safePage = Math.min(page, lastPage);
  const startIndex = (safePage - 1) * pageSize;

  return {
    // Cloned so a caller mutating a row on screen can never corrupt the store.
    items: result.slice(startIndex, startIndex + pageSize).map((row) => clone(row)),
    total,
    page: safePage,
    pageSize,
  };
}
