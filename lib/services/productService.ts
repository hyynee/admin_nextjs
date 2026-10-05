import type {
  ListParams,
  ListResult,
  Product,
  ProductImage,
  ProductInput,
  Variant,
} from "@/types";
import { db } from "@/lib/mock";
import { nextId } from "@/lib/mock/helpers";
import { isDuplicateVariant, totalStock } from "@/lib/utils/variant";
import { ConflictError, NotFoundError, ServiceError } from "./errors";
import { clone, delay, matchesSearch, queryList } from "./query";

function findIndex(id: string): number {
  return db.products.findIndex((row) => row.id === id);
}

/**
 * Enforced on the server side of the mock, not just in the form: the
 * (productId + sizeId + colorId) uniqueness rule must hold no matter who calls.
 */
function assertVariantsAreUnique(
  variants: ProductInput["variants"],
  fields: Record<string, string> = {},
): void {
  const seen: Array<{ sizeId: string; colorId: string }> = [];
  for (const variant of variants) {
    if (isDuplicateVariant(seen, { sizeId: variant.sizeId, colorId: variant.colorId })) {
      throw new ConflictError(
        "Two variants share the same size and colour combination",
        { ...fields, variants: "Duplicate size and colour combination" },
      );
    }
    seen.push({ sizeId: variant.sizeId, colorId: variant.colorId });
  }
}

function assertUniqueSlug(slug: string, ignoreId?: string): void {
  if (db.products.some((row) => row.slug === slug && row.id !== ignoreId)) {
    throw new ServiceError(`Slug "${slug}" is already taken`, {
      fields: { slug: "Slug is already taken" },
    });
  }
}

function assertReferences(input: ProductInput): void {
  if (!db.categories.some((row) => row.id === input.categoryId)) {
    throw new ServiceError("Unknown category", { fields: { categoryId: "Select a category" } });
  }
  if (!db.collections.some((row) => row.id === input.collectionId)) {
    throw new ServiceError("Unknown collection", {
      fields: { collectionId: "Select a collection" },
    });
  }
  const sizeIds = new Set(db.sizes.map((row) => row.id));
  const colorIds = new Set(db.colors.map((row) => row.id));
  for (const variant of input.variants) {
    if (!sizeIds.has(variant.sizeId)) {
      throw new ServiceError("Unknown size", { fields: { variants: "Unknown size selected" } });
    }
    if (!colorIds.has(variant.colorId)) {
      throw new ServiceError("Unknown colour", { fields: { variants: "Unknown colour selected" } });
    }
  }
}

function assertSaleWindow(input: ProductInput): void {
  const hasStart = input.saleStartsAt !== null;
  const hasEnd = input.saleEndsAt !== null;
  if (hasStart !== hasEnd) {
    throw new ServiceError("Set both a sale start and a sale end, or neither", {
      fields: { saleEndsAt: "Set both a sale start and a sale end, or neither" },
    });
  }
  if (
    hasStart &&
    hasEnd &&
    new Date(input.saleEndsAt as string) <= new Date(input.saleStartsAt as string)
  ) {
    throw new ServiceError("Sale end must be after the sale start", {
      fields: { saleEndsAt: "Sale end must be after the sale start" },
    });
  }
  if (input.salePrice !== null && input.salePrice >= input.price) {
    throw new ServiceError("Sale price must be lower than the price", {
      fields: { salePrice: "Sale price must be lower than the price" },
    });
  }
}

function buildVariants(productId: string, input: ProductInput): Variant[] {
  return input.variants.map((variant) => ({
    id: variant.id ?? nextId("var"),
    productId,
    sizeId: variant.sizeId,
    colorId: variant.colorId,
    sku: variant.sku,
    stockQuantity: variant.stockQuantity,
  }));
}

function buildImages(productId: string, input: ProductInput): ProductImage[] {
  return input.images.map((image, index) => ({
    id: image.id ?? nextId("img"),
    productId,
    colorId: image.colorId,
    url: image.url,
    altText: image.altText,
    sortOrder: image.sortOrder || index + 1,
  }));
}

export const productService = {
  async list(params: ListParams = {}): Promise<ListResult<Product>> {
    await delay();
    return queryList(db.products, params, {
      // Requirement: search on name.
      search: (row, needle) => matchesSearch([row.name], needle),
      filter: (row, filters) => {
        if (filters.categoryId && row.categoryId !== filters.categoryId) return false;
        if (filters.collectionId && row.collectionId !== filters.collectionId) return false;
        if (filters.isActive === "true" && !row.isActive) return false;
        if (filters.isActive === "false" && row.isActive) return false;
        return true;
      },
      sortValue: (row, sort) => {
        if (sort === "stock") return totalStock(row.variants);
        return (row as unknown as Record<string, unknown>)[sort];
      },
      defaultSort: "createdAt",
    });
  },

  async get(id: string): Promise<Product | null> {
    await delay();
    const row = db.products.find((item) => item.id === id);
    return row ? clone(row) : null;
  },

  async create(input: ProductInput): Promise<Product> {
    await delay(220);
    if (input.variants.length === 0) {
      throw new ServiceError("A product needs at least one variant", {
        fields: { variants: "Add at least one variant" },
      });
    }
    assertUniqueSlug(input.slug);
    assertReferences(input);
    assertSaleWindow(input);
    assertVariantsAreUnique(input.variants);

    const id = nextId("prod");
    const row: Product = {
      id,
      name: input.name,
      slug: input.slug,
      description: input.description,
      price: input.price,
      salePrice: input.salePrice,
      saleStartsAt: input.saleStartsAt,
      saleEndsAt: input.saleEndsAt,
      categoryId: input.categoryId,
      collectionId: input.collectionId,
      isActive: input.isActive,
      createdAt: new Date().toISOString(),
      variants: buildVariants(id, input),
      images: buildImages(id, input),
    };
    db.products.unshift(row);
    return clone(row);
  },

  async update(id: string, input: ProductInput): Promise<Product> {
    await delay(220);
    const index = findIndex(id);
    if (index === -1) throw new NotFoundError("Product not found");
    if (input.variants.length === 0) {
      throw new ServiceError("A product needs at least one variant", {
        fields: { variants: "Add at least one variant" },
      });
    }
    assertUniqueSlug(input.slug, id);
    assertReferences(input);
    assertSaleWindow(input);
    assertVariantsAreUnique(input.variants);

    const updated: Product = {
      ...db.products[index],
      name: input.name,
      slug: input.slug,
      description: input.description,
      price: input.price,
      salePrice: input.salePrice,
      saleStartsAt: input.saleStartsAt,
      saleEndsAt: input.saleEndsAt,
      categoryId: input.categoryId,
      collectionId: input.collectionId,
      isActive: input.isActive,
      variants: buildVariants(id, input),
      images: buildImages(id, input),
    };
    db.products[index] = updated;
    return clone(updated);
  },

  async remove(id: string): Promise<void> {
    await delay();
    const index = findIndex(id);
    if (index === -1) throw new NotFoundError("Product not found");
    db.products.splice(index, 1);
  },

  /** Reference data for the form's selects. */
  async options(): Promise<{
    categories: Array<{ id: string; name: string }>;
    collections: Array<{ id: string; name: string }>;
    sizes: Array<{ id: string; label: string }>;
    colors: Array<{ id: string; name: string; hexCode: string }>;
  }> {
    await delay(80);
    return {
      categories: db.categories.map(({ id, name }) => ({ id, name })),
      collections: db.collections.map(({ id, name }) => ({ id, name })),
      sizes: [...db.sizes]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(({ id, label }) => ({ id, label })),
      colors: db.colors.map(({ id, name, hexCode }) => ({ id, name, hexCode })),
    };
  },
};
