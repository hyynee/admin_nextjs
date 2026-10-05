import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/mock";
import {
  categoryService,
  couponService,
  orderService,
  productService,
  sizeService,
  userService,
} from "@/lib/services";
import { isServiceError } from "@/lib/services";
import type { ProductInput } from "@/types";

/**
 * The mock database is module-level and mutable, so every test starts from a
 * known snapshot rather than inheriting the previous test's writes.
 */
function seedProducts() {
  db.products = JSON.parse(JSON.stringify(originalProducts));
}

const originalProducts = JSON.parse(JSON.stringify(db.products));
const originalOrders = JSON.parse(JSON.stringify(db.orders));
const originalCategories = JSON.parse(JSON.stringify(db.categories));

beforeEach(() => {
  seedProducts();
  db.orders = JSON.parse(JSON.stringify(originalOrders));
  db.categories = JSON.parse(JSON.stringify(originalCategories));
});

/** A minimal valid product payload, used as the base for the mutation tests. */
function baseInput(overrides: Partial<ProductInput> = {}): ProductInput {
  const product = db.products[0];
  const variant = product.variants[0];
  return {
    name: "Test Shirt",
    slug: "test-shirt",
    description: "",
    price: 50,
    salePrice: null,
    saleStartsAt: null,
    saleEndsAt: null,
    categoryId: product.categoryId,
    collectionId: product.collectionId,
    isActive: true,
    variants: [
      { sizeId: variant.sizeId, colorId: variant.colorId, sku: "TEST-SKU", stockQuantity: 5 },
    ],
    images: [],
    ...overrides,
  };
}

describe("list behaviour is server-side", () => {
  it("searches products by name", async () => {
    const all = await productService.list({});
    const target = all.items[0];
    const found = await productService.list({ search: target.name });
    expect(found.items.map((row) => row.id)).toContain(target.id);
  });

  it("paginates and reports a stable total", async () => {
    const page = await productService.list({ page: 1, pageSize: 2, sort: "name" });
    expect(page.items).toHaveLength(2);
    expect(page.page).toBe(1);
    expect(page.pageSize).toBe(2);
    expect(page.total).toBeGreaterThan(2);
  });

  it("clamps a stale out-of-range page instead of showing an empty table", async () => {
    const page = await productService.list({ page: 999, pageSize: 10 });
    expect(page.items).toHaveLength(10);
    // The response reports the page actually served, so the pager stays in sync.
    expect(page.page).toBe(Math.ceil(page.total / 10));
  });

  it("returns a defensive copy, so callers cannot mutate the store", async () => {
    const first = await productService.list({});
    first.items[0].name = "Mutated outside";
    const second = await productService.list({});
    expect(second.items[0].name).not.toBe("Mutated outside");
  });

  it("filters orders by status", async () => {
    const page = await orderService.list({ filters: { status: "PENDING" }, pageSize: 100 });
    expect(page.items.every((order) => order.status === "PENDING")).toBe(true);
  });

  it("searches orders by customer name as well as order code", async () => {
    const all = await orderService.list({});
    const target = all.items[0];
    const byCode = await orderService.list({ search: target.orderCode });
    const byName = await orderService.list({ search: target.recipientName });
    expect(byCode.items.some((row) => row.id === target.id)).toBe(true);
    expect(byName.items.some((row) => row.id === target.id)).toBe(true);
  });
});

describe("product rules", () => {
  it("creates a product and derives the variants", async () => {
    const created = await productService.create(baseInput());
    expect(created.id).toBeTruthy();
    expect(created.variants).toHaveLength(1);
    expect(created.variants[0].productId).toBe(created.id);
    expect(created.variants[0].stockQuantity).toBe(5);
  });

  it("never stores a price on a variant", async () => {
    const created = await productService.create(baseInput());
    expect(Object.keys(created.variants[0])).not.toContain("price");
  });

  it("refuses a duplicate slug and names the offending field", async () => {
    const existing = db.products[0].slug;
    await expect(productService.create(baseInput({ slug: existing }))).rejects.toMatchObject({
      fields: { slug: expect.any(String) },
    });
  });

  it("allows a product to keep its own slug when edited", async () => {
    const target = db.products[0];
    const updated = await productService.update(target.id, {
      name: target.name,
      slug: target.slug,
      description: target.description,
      price: target.price,
      salePrice: target.salePrice,
      saleStartsAt: target.saleStartsAt,
      saleEndsAt: target.saleEndsAt,
      categoryId: target.categoryId,
      collectionId: target.collectionId,
      isActive: target.isActive,
      variants: target.variants.map((variant) => ({
        id: variant.id,
        sizeId: variant.sizeId,
        colorId: variant.colorId,
        sku: variant.sku,
        stockQuantity: variant.stockQuantity,
      })),
      images: [],
    });
    expect(updated.slug).toBe(target.slug);
  });

  it("refuses two variants with the same size and colour", async () => {
    const product = db.products[0];
    const [first, second] = product.variants;
    const input = baseInput({
      variants: [
        { sizeId: first.sizeId, colorId: first.colorId, sku: "A", stockQuantity: 1 },
        { sizeId: second.sizeId, colorId: second.colorId, sku: "B", stockQuantity: 1 },
      ],
    });
    // Force the collision by reusing the first pair.
    input.variants[1] = { ...input.variants[0], sku: "B" };
    await expect(productService.create(input)).rejects.toMatchObject({
      status: 409,
    });
  });

  it("refuses a product with no variants", async () => {
    await expect(productService.create(baseInput({ variants: [] }))).rejects.toThrow(
      /at least one variant/i,
    );
  });

  it("requires both ends of a sale window, and requires the end to be later", async () => {
    await expect(
      productService.create(baseInput({ saleStartsAt: "2030-01-01T00:00:00.000Z" })),
    ).rejects.toThrow(/both a sale start and a sale end/i);

    await expect(
      productService.create(
        baseInput({
          saleStartsAt: "2030-01-02T00:00:00.000Z",
          saleEndsAt: "2030-01-01T00:00:00.000Z",
        }),
      ),
    ).rejects.toThrow(/after the sale start/i);
  });

  it("refuses a sale price that is not lower than the price", async () => {
    await expect(productService.create(baseInput({ price: 10, salePrice: 10 }))).rejects.toThrow(
      /lower than the price/i,
    );
  });

  it("keeps shared images with a null colorId", async () => {
    const created = await productService.create(
      baseInput({
        images: [{ colorId: null, url: "https://cdn.test/a.png", altText: "a", sortOrder: 1 }],
      }),
    );
    expect(created.images[0].colorId).toBeNull();
  });
});

describe("delete guards", () => {
  it("refuses to delete a category that still has products", async () => {
    const used = db.categories.find((category) =>
      db.products.some((product) => product.categoryId === category.id),
    );
    expect(used).toBeDefined();
    await expect(categoryService.remove(used!.id)).rejects.toMatchObject({ status: 409 });
  });

  it("allows deleting a category nothing references", async () => {
    const created = await categoryService.create({ name: "Orphan", slug: "orphan" });
    await expect(categoryService.remove(created.id)).resolves.toBeUndefined();
  });

  it("refuses to delete a size still used by a variant", async () => {
    const usedSizeId = db.products[0].variants[0].sizeId;
    await expect(sizeService.remove(usedSizeId)).rejects.toMatchObject({ status: 409 });
  });
});

describe("order status flow is enforced in the service", () => {
  it("advances one step and stamps paidAt on confirmation", async () => {
    const pending = db.orders.find((order) => order.status === "PENDING");
    expect(pending).toBeDefined();
    const updated = await orderService.updateStatus(pending!.id, "CONFIRMED");
    expect(updated.status).toBe("CONFIRMED");
    expect(updated.payment.paidAt).not.toBeNull();
  });

  it("refuses to skip a step", async () => {
    const pending = db.orders.find((order) => order.status === "PENDING");
    await expect(orderService.updateStatus(pending!.id, "SHIPPING")).rejects.toThrow(
      /cannot move an order/i,
    );
  });

  it("refuses to cancel a delivered order", async () => {
    const delivered = db.orders.find((order) => order.status === "DELIVERED");
    if (!delivered) return;
    await expect(orderService.updateStatus(delivered.id, "CANCELLED")).rejects.toThrow();
  });
});

describe("coupons", () => {
  it("stores the code uppercase", async () => {
    const created = await couponService.create({
      code: "summer10",
      description: "",
      discountType: "PERCENT",
      discountValue: 10,
      minOrderAmount: 0,
      maxDiscountAmount: null,
      maxUses: 100,
      startsAt: "2030-01-01T00:00:00.000Z",
      endsAt: "2030-12-31T00:00:00.000Z",
      isActive: true,
    });
    expect(created.code).toBe("SUMMER10");
    expect(created.usedCount).toBe(0);
  });

  it("refuses a percentage above 100", async () => {
    await expect(
      couponService.create({
        code: "TOOMUCH",
        description: "",
        discountType: "PERCENT",
        discountValue: 150,
        minOrderAmount: 0,
        maxDiscountAmount: null,
        maxUses: 10,
        startsAt: "2030-01-01T00:00:00.000Z",
        endsAt: "2030-12-31T00:00:00.000Z",
        isActive: true,
      }),
    ).rejects.toThrow(/between 0 and 100/i);
  });

  it("refuses an end date before the start date", async () => {
    await expect(
      couponService.create({
        code: "BACKWARDS",
        description: "",
        discountType: "FIXED",
        discountValue: 5,
        minOrderAmount: 0,
        maxDiscountAmount: null,
        maxUses: 10,
        startsAt: "2030-12-31T00:00:00.000Z",
        endsAt: "2030-01-01T00:00:00.000Z",
        isActive: true,
      }),
    ).rejects.toThrow();
  });
});

describe("users", () => {
  it("changes the role but nothing else", async () => {
    const user = db.users.find((row) => row.role === "CUSTOMER");
    expect(user).toBeDefined();
    const updated = await userService.updateRole(user!.id, "ADMIN");
    expect(updated.role).toBe("ADMIN");
    expect(updated.email).toBe(user!.email);
    expect(updated.addresses).toHaveLength(user!.addresses.length);
  });

  it("refuses a no-op role change", async () => {
    const user = db.users[0];
    await expect(userService.updateRole(user.id, user.role)).rejects.toThrow(/already/i);
  });

  it("excludes cancelled orders from lifetime spend", async () => {
    const stats = await userService.stats(db.users[0].id);
    const orders = db.orders.filter((order) => order.userId === db.users[0].id);
    const expected = orders
      .filter((order) => order.status !== "CANCELLED")
      .reduce((sum, order) => sum + order.total, 0);
    expect(stats.lifetimeSpend).toBeCloseTo(expected, 2);
  });

  it("throws a typed error for a missing user", async () => {
    await expect(userService.get("does-not-exist")).resolves.toBeNull();
    try {
      await userService.stats("does-not-exist");
      throw new Error("expected a rejection");
    } catch (error) {
      expect(isServiceError(error)).toBe(true);
    }
  });
});