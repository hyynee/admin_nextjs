import { describe, expect, it } from "vitest";
import {
  areStatesEqual,
  clampPage,
  parseListState,
  serializeListState,
  totalPages,
  withResetPage,
  type AdminListState,
  type ListStateDefaults,
} from "@/lib/utils/query";

/** Minimal stand-in for the read-only `ReadonlyURLSearchParams`. */
function params(query: string): { get(name: string): string | null } {
  return new URLSearchParams(query);
}

const DEFAULTS: ListStateDefaults = {
  sort: "createdAt",
  direction: "desc",
  pageSize: 10,
  filterKeys: ["status", "isActive"],
};

/** A list left entirely at the page's defaults. */
function state(overrides: Partial<AdminListState> = {}): AdminListState {
  return {
    page: 1,
    pageSize: DEFAULTS.pageSize ?? 10,
    search: "",
    sort: DEFAULTS.sort ?? "",
    direction: DEFAULTS.direction ?? "asc",
    filters: {},
    ...overrides,
  };
}

describe("parseListState", () => {
  it("falls back to defaults when the URL is empty", () => {
    expect(parseListState(params(""), DEFAULTS)).toEqual({
      page: 1,
      pageSize: 10,
      search: "",
      sort: "createdAt",
      direction: "desc",
      filters: {},
    });
  });

  it("reads every value from the URL", () => {
    const result = parseListState(
      params("page=3&pageSize=20&search=linen&sort=price&dir=asc&status=PENDING&isActive=true"),
      DEFAULTS,
    );
    expect(result).toEqual({
      page: 3,
      pageSize: 20,
      search: "linen",
      sort: "price",
      direction: "asc",
      filters: { status: "PENDING", isActive: "true" },
    });
  });

  it("falls back to the global default when a page declares none", () => {
    expect(parseListState(params(""), {}).pageSize).toBe(10);
  });

  it("never produces a 0-based or NaN page", () => {
    for (const raw of ["page=0", "page=-4", "page=abc", "page="]) {
      expect(parseListState(params(raw), DEFAULTS).page).toBe(1);
    }
  });

  it("ignores a page size outside the allowed options", () => {
    expect(parseListState(params("pageSize=25"), DEFAULTS).pageSize).toBe(10);
    expect(parseListState(params("pageSize=25"), { pageSize: 20 }).pageSize).toBe(20);
  });

  it("ignores an unrecognised direction", () => {
    expect(parseListState(params("dir=sideways"), DEFAULTS).direction).toBe("desc");
  });

  it("ignores filter keys the page does not declare", () => {
    const result = parseListState(params("colour=red"), DEFAULTS);
    expect(result.filters).toEqual({});
  });

  it("treats an empty filter value as absent", () => {
    expect(parseListState(params("status=&isActive=true"), DEFAULTS).filters).toEqual({
      isActive: "true",
    });
  });

  it("trims the search term", () => {
    expect(parseListState(params("search=%20linen%20"), DEFAULTS).search).toBe("linen");
  });
});

describe("serializeListState", () => {
  it("omits everything left at its default, so the URL stays clean", () => {
    expect(serializeListState(state(), DEFAULTS)).toBe("");
  });

  it("writes only what differs from the defaults", () => {
    const query = serializeListState(state({ page: 2, sort: "price" }), DEFAULTS);
    expect(query).toBe("sort=price&page=2");
  });

  it("writes a direction that differs from the default", () => {
    expect(serializeListState(state({ direction: "asc" }), DEFAULTS)).toBe("dir=asc");
  });

  it("only writes filters declared by the page", () => {
    expect(serializeListState(state({ filters: { status: "PENDING" } }), DEFAULTS)).toBe(
      "status=PENDING",
    );
    expect(serializeListState(state({ filters: { nope: "x" } }), DEFAULTS)).toBe("");
  });

  it("round-trips through parse unchanged", () => {
    const original = state({
      page: 4,
      pageSize: 20,
      search: "linen shirt",
      sort: "price",
      direction: "asc",
      filters: { status: "SHIPPING", isActive: "false" },
    });
    const round = parseListState(params(serializeListState(original, DEFAULTS)), DEFAULTS);
    expect(round).toEqual(original);
  });
});

describe("areStatesEqual", () => {
  it("treats identical states as equal", () => {
    expect(areStatesEqual(state({ page: 2 }), state({ page: 2 }))).toBe(true);
  });

  it("detects a changed page", () => {
    expect(areStatesEqual(state({ page: 2 }), state({ page: 3 }))).toBe(false);
  });

  it("ignores a key order change in the filters", () => {
    const a = state({ filters: { status: "PENDING", isActive: "true" } });
    const b = state({ filters: { isActive: "true", status: "PENDING" } });
    expect(areStatesEqual(a, b)).toBe(true);
  });
});

describe("totalPages and clampPage", () => {
  it("rounds partial pages up", () => {
    expect(totalPages(0, 10)).toBe(1);
    expect(totalPages(1, 10)).toBe(1);
    expect(totalPages(10, 10)).toBe(1);
    expect(totalPages(11, 10)).toBe(2);
    expect(totalPages(20, 10)).toBe(2);
    expect(totalPages(21, 10)).toBe(3);
  });

  it("never reports zero pages", () => {
    expect(totalPages(0, 10)).toBeGreaterThanOrEqual(1);
    expect(totalPages(5, 0)).toBe(1);
  });

  it("pulls an out-of-range page back into range", () => {
    // The case that matters: a filter shrinks the set while the user is on page 9.
    expect(clampPage(9, 12, 10)).toBe(2);
    expect(clampPage(99, 0, 10)).toBe(1);
    expect(clampPage(-5, 100, 10)).toBe(1);
  });

  it("leaves a valid page untouched", () => {
    expect(clampPage(2, 30, 10)).toBe(2);
  });

  it("clamps to exactly the last page, with no off-by-one", () => {
    expect(clampPage(3, 21, 10)).toBe(3);
    expect(clampPage(4, 21, 10)).toBe(3);
  });
});

describe("withResetPage", () => {
  it("returns to page 1 when a filter changes", () => {
    expect(withResetPage(state({ page: 5 })).page).toBe(1);
  });

  it("preserves every other field", () => {
    const next = withResetPage(state({ page: 5, search: "linen", sort: "price" }));
    expect(next).toEqual(state({ page: 1, search: "linen", sort: "price" }));
  });

  it("returns the same object when already on page 1, so React skips the render", () => {
    const current = state({ page: 1 });
    expect(withResetPage(current)).toBe(current);
  });
});