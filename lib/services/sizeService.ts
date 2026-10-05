import type { ListParams, ListResult, Size, SizeInput } from "@/types";
import { db } from "@/lib/mock";
import { nextId } from "@/lib/mock/helpers";
import { ConflictError, NotFoundError, ServiceError } from "./errors";
import { clone, delay, matchesSearch, queryList } from "./query";

function findIndex(id: string): number {
  return db.sizes.findIndex((row) => row.id === id);
}

function assertUniqueLabel(label: string, ignoreId?: string): void {
  const clash = db.sizes.find(
    (row) => row.id !== ignoreId && row.label.toLowerCase() === label.toLowerCase(),
  );
  if (clash) {
    throw new ServiceError(`Size "${label}" already exists`, {
      fields: { label: "This size already exists" },
    });
  }
}

export const sizeService = {
  async list(params: ListParams = {}): Promise<ListResult<Size>> {
    await delay();
    return queryList(db.sizes, params, {
      search: (row, needle) => matchesSearch([row.label], needle),
      defaultSort: "sortOrder",
    });
  },

  async get(id: string): Promise<Size | null> {
    await delay();
    const row = db.sizes.find((item) => item.id === id);
    return row ? clone(row) : null;
  },

  async create(input: SizeInput): Promise<Size> {
    await delay();
    assertUniqueLabel(input.label);
    const row: Size = { id: nextId("size"), ...input };
    db.sizes.push(row);
    return clone(row);
  },

  async update(id: string, input: SizeInput): Promise<Size> {
    await delay();
    const index = findIndex(id);
    if (index === -1) throw new NotFoundError("Size not found");
    assertUniqueLabel(input.label, id);
    const updated: Size = { ...db.sizes[index], ...input };
    db.sizes[index] = updated;
    return clone(updated);
  },

  async remove(id: string): Promise<void> {
    await delay();
    const index = findIndex(id);
    if (index === -1) throw new NotFoundError("Size not found");
    const usedBy = db.products.filter((product) =>
      product.variants.some((variant) => variant.sizeId === id),
    ).length;
    if (usedBy > 0) {
      throw new ConflictError(
        `Cannot delete: ${usedBy} product${usedBy === 1 ? "" : "s"} still use this size`,
      );
    }
    db.sizes.splice(index, 1);
  },

  async counts(): Promise<Record<string, number>> {
    await delay(80);
    return db.sizes.reduce<Record<string, number>>((acc, size) => {
      acc[size.id] = db.products.filter((product) =>
        product.variants.some((variant) => variant.sizeId === size.id),
      ).length;
      return acc;
    }, {});
  },
};
