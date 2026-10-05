import type { Category, CategoryInput, ListParams, ListResult } from "@/types";
import { db } from "@/lib/mock";
import { nextId } from "@/lib/mock/helpers";
import { ConflictError, NotFoundError, ServiceError } from "./errors";
import { clone, delay, matchesSearch, queryList } from "./query";

function findIndex(id: string): number {
  return db.categories.findIndex((row) => row.id === id);
}

function assertUnique(name: string, slug: string, ignoreId?: string): void {
  const clash = db.categories.find(
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

export const categoryService = {
  async list(params: ListParams = {}): Promise<ListResult<Category>> {
    await delay();
    return queryList(db.categories, params, {
      search: (row, needle) => matchesSearch([row.name, row.slug], needle),
      defaultSort: "name",
    });
  },

  async get(id: string): Promise<Category | null> {
    await delay();
    const row = db.categories.find((item) => item.id === id);
    return row ? clone(row) : null;
  },

  async create(input: CategoryInput): Promise<Category> {
    await delay();
    assertUnique(input.name, input.slug);
    const row: Category = { id: nextId("cat"), ...input };
    db.categories.push(row);
    return clone(row);
  },

  async update(id: string, input: CategoryInput): Promise<Category> {
    await delay();
    const index = findIndex(id);
    if (index === -1) throw new NotFoundError("Category not found");
    assertUnique(input.name, input.slug, id);
    const updated: Category = { ...db.categories[index], ...input };
    db.categories[index] = updated;
    return clone(updated);
  },

  async remove(id: string): Promise<void> {
    await delay();
    const index = findIndex(id);
    if (index === -1) throw new NotFoundError("Category not found");
    const usedBy = db.products.filter((product) => product.categoryId === id).length;
    if (usedBy > 0) {
      throw new ConflictError(
        `Cannot delete: ${usedBy} product${usedBy === 1 ? "" : "s"} still use this category`,
      );
    }
    db.categories.splice(index, 1);
  },

  /** Product count per category, used by the list page. */
  async counts(): Promise<Record<string, number>> {
    await delay(80);
    return db.categories.reduce<Record<string, number>>((acc, category) => {
      acc[category.id] = db.products.filter((product) => product.categoryId === category.id).length;
      return acc;
    }, {});
  },
};
