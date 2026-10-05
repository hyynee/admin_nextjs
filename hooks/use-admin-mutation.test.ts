import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import {
  isListResult,
  optimisticallyRemoveFromLists,
} from "@/hooks/use-admin-mutation";
import type { ListResult, Size } from "@/types";

function list(ids: string[]): ListResult<Size> {
  return {
    items: ids.map((id, index) => ({ id, label: id.toUpperCase(), sortOrder: index })),
    total: ids.length,
    page: 1,
    pageSize: 10,
  };
}

function client() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

describe("isListResult", () => {
  it("accepts a list result", () => {
    expect(isListResult(list(["a"]))).toBe(true);
  });

  it("rejects the other shapes cached under the same entity prefix", () => {
    // This is the shape that used to crash the optimistic delete.
    expect(isListResult({ a: 3, b: 1 })).toBe(false);
    expect(isListResult(["s1", "s2"])).toBe(false);
    expect(isListResult(undefined)).toBe(false);
    expect(isListResult(null)).toBe(false);
    expect(isListResult(7)).toBe(false);
  });
});

describe("optimisticallyRemoveFromLists", () => {
  it("removes the row from a cached list and lowers the total", () => {
    const qc = client();
    qc.setQueryData(["sizes", { page: 1 }], list(["a", "b", "c"]));

    optimisticallyRemoveFromLists<Size>(qc, "sizes", "b");

    const data = qc.getQueryData<ListResult<Size>>(["sizes", { page: 1 }]);
    expect(data?.items.map((i) => i.id)).toEqual(["a", "c"]);
    expect(data?.total).toBe(2);
  });

  it("leaves a sibling counts cache untouched", () => {
    const qc = client();
    qc.setQueryData(["sizes", { page: 1 }], list(["a", "b"]));
    qc.setQueryData(["sizes", "counts"], { a: 4, b: 2 });

    expect(() => optimisticallyRemoveFromLists<Size>(qc, "sizes", "b")).not.toThrow();

    expect(qc.getQueryData(["sizes", "counts"])).toEqual({ a: 4, b: 2 });
    expect(qc.getQueryData<ListResult<Size>>(["sizes", { page: 1 }])?.total).toBe(1);
  });

  it("returns only the list entries, so a rollback cannot restore junk", () => {
    const qc = client();
    qc.setQueryData(["sizes", { page: 1 }], list(["a", "b"]));
    qc.setQueryData(["sizes", "counts"], { a: 1 });

    const previous = optimisticallyRemoveFromLists<Size>(qc, "sizes", "a");

    expect(previous).toHaveLength(1);
    expect(previous[0]?.[0]).toEqual(["sizes", { page: 1 }]);
  });

  it("copes with a cold cache", () => {
    const qc = client();
    expect(optimisticallyRemoveFromLists<Size>(qc, "sizes", "a")).toEqual([]);
  });

  it("never drives the total below zero", () => {
    const qc = client();
    qc.setQueryData(["sizes", { page: 1 }], { ...list(["a"]), total: 0 });

    optimisticallyRemoveFromLists<Size>(qc, "sizes", "a");

    expect(qc.getQueryData<ListResult<Size>>(["sizes", { page: 1 }])?.total).toBe(0);
  });

  it("leaves other entities alone", () => {
    const qc = client();
    qc.setQueryData(["colors", { page: 1 }], { ...list(["c1"]), total: 1 });

    optimisticallyRemoveFromLists<Size>(qc, "sizes", "c1");

    expect(qc.getQueryData<ListResult<Size>>(["colors", { page: 1 }])?.total).toBe(1);
  });
});