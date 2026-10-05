import type { Color, ColorInput, ListParams, ListResult } from "@/types";
import { db } from "@/lib/mock";
import { nextId } from "@/lib/mock/helpers";
import { ConflictError, NotFoundError, ServiceError } from "./errors";
import { clone, delay, matchesSearch, queryList } from "./query";

function findIndex(id: string): number {
  return db.colors.findIndex((row) => row.id === id);
}

function assertUniqueName(name: string, ignoreId?: string): void {
  const clash = db.colors.find(
    (row) => row.id !== ignoreId && row.name.toLowerCase() === name.toLowerCase(),
  );
  if (clash) {
    throw new ServiceError(`Colour "${name}" already exists`, {
      fields: { name: "This colour already exists" },
    });
  }
}

export const colorService = {
  async list(params: ListParams = {}): Promise<ListResult<Color>> {
    await delay();
    return queryList(db.colors, params, {
      search: (row, needle) => matchesSearch([row.name, row.hexCode], needle),
      defaultSort: "name",
    });
  },

  async get(id: string): Promise<Color | null> {
    await delay();
    const row = db.colors.find((item) => item.id === id);
    return row ? clone(row) : null;
  },

  async create(input: ColorInput): Promise<Color> {
    await delay();
    assertUniqueName(input.name);
    const row: Color = { id: nextId("color"), ...input };
    db.colors.push(row);
    return clone(row);
  },

  async update(id: string, input: ColorInput): Promise<Color> {
    await delay();
    const index = findIndex(id);
    if (index === -1) throw new NotFoundError("Colour not found");
    assertUniqueName(input.name, id);
    const updated: Color = { ...db.colors[index], ...input };
    db.colors[index] = updated;
    return clone(updated);
  },

  async remove(id: string): Promise<void> {
    await delay();
    const index = findIndex(id);
    if (index === -1) throw new NotFoundError("Colour not found");
    const usedBy = db.products.filter((product) =>
      product.variants.some((variant) => variant.colorId === id),
    ).length;
    if (usedBy > 0) {
      throw new ConflictError(
        `Cannot delete: ${usedBy} product${usedBy === 1 ? "" : "s"} still use this colour`,
      );
    }
    db.colors.splice(index, 1);
  },

  async counts(): Promise<Record<string, number>> {
    await delay(80);
    return db.colors.reduce<Record<string, number>>((acc, color) => {
      acc[color.id] = db.products.filter((product) =>
        product.variants.some((variant) => variant.colorId === color.id),
      ).length;
      return acc;
    }, {});
  },
};
