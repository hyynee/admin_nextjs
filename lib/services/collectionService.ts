import type { Collection, CollectionInput, ListParams, ListResult } from "@/types";
import { db } from "@/lib/mock";
import { nextId } from "@/lib/mock/helpers";
import { ConflictError, NotFoundError, ServiceError } from "./errors";
import { clone, delay, matchesSearch, queryList } from "./query";

function findIndex(id: string): number {
  return db.collections.findIndex((row) => row.id === id);
}

function assertUnique(name: string, slug: string, ignoreId?: string): void {
  const clash = db.collections.find(
    (row) =>
      row.id !== ignoreId &&
      (row.slug === slug || row.name.toLowerCase() === name.toLowerCase()),
  );
  if (clash) {
    throw new ServiceError(`"${name}" already exists`, {
      fields: clash.slug === slug ? { slug: "Slug is already taken" } : { name: "Name is already taken" },
    });
  }
}

export const collectionService = {
  async list(params: ListParams = {}): Promise<ListResult<Collection>> {
    await delay();
    return queryList(db.collections, params, {
      search: (row, needle) => matchesSearch([row.name, row.slug, row.season, row.year], needle),
      filter: (row, filters) => {
        if (filters.season && row.season !== filters.season) return false;
        if (filters.year && String(row.year) !== filters.year) return false;
        if (filters.isActive === "true" && !row.isActive) return false;
        if (filters.isActive === "false" && row.isActive) return false;
        return true;
      },
      sortValue: (row, sort) =>
        sort === "products"
          ? db.products.filter((product) => product.collectionId === row.id).length
          : (row as unknown as Record<string, unknown>)[sort],
      defaultSort: "name",
    });
  },

  async get(id: string): Promise<Collection | null> {
    await delay();
    const row = db.collections.find((item) => item.id === id);
    return row ? clone(row) : null;
  },

  async create(input: CollectionInput): Promise<Collection> {
    await delay();
    assertUnique(input.name, input.slug);
    const row: Collection = { id: nextId("col"), ...input };
    db.collections.push(row);
    return clone(row);
  },

  async update(id: string, input: CollectionInput): Promise<Collection> {
    await delay();
    const index = findIndex(id);
    if (index === -1) throw new NotFoundError("Collection not found");
    assertUnique(input.name, input.slug, id);
    const updated: Collection = { ...db.collections[index], ...input };
    db.collections[index] = updated;
    return clone(updated);
  },

  async remove(id: string): Promise<void> {
    await delay();
    const index = findIndex(id);
    if (index === -1) throw new NotFoundError("Collection not found");
    const usedBy = db.products.filter((product) => product.collectionId === id).length;
    if (usedBy > 0) {
      throw new ConflictError(
        `Cannot delete: ${usedBy} product${usedBy === 1 ? "" : "s"} still use this collection`,
      );
    }
    db.collections.splice(index, 1);
  },

  async counts(): Promise<Record<string, number>> {
    await delay(80);
    return db.collections.reduce<Record<string, number>>((acc, collection) => {
      acc[collection.id] = db.products.filter((product) => product.collectionId === collection.id).length;
      return acc;
    }, {});
  },

  /** Distinct seasons, for the filter dropdown. */
  async seasons(): Promise<string[]> {
    await delay(80);
    return [...new Set(db.collections.map((row) => row.season))].sort();
  },
};
