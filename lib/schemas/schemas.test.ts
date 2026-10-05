import { describe, expect, it } from "vitest";
import {
  categoryFormSchema,
  couponFormSchema,
  orderStatusSchema,
  productFormSchema,
  sizeFormSchema,
  toProductFormDefaultValues,
  toProductInput,
} from "@/lib/schemas";
import type { Product } from "@/types";

describe("category schema", () => {
  it("accepts a plain slug", () => {
    const result = categoryFormSchema.safeParse({ name: "Shirts", slug: "shirts" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(categoryFormSchema.safeParse({ name: "   ", slug: "shirts" }).success).toBe(false);
  });

  it("rejects an uppercase or spaced slug", () => {
    expect(categoryFormSchema.safeParse({ name: "Shirts", slug: "Shirts" }).success).toBe(false);
    expect(categoryFormSchema.safeParse({ name: "Shirts", slug: "my shirts" }).success).toBe(false);
  });
});

describe("size schema", () => {
  it("coerces the sort order string to a number", () => {
    const result = sizeFormSchema.safeParse({ label: "M", sortOrder: "3" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.sortOrder).toBe(3);
  });

  it("refuses a fractional sort order", () => {
    expect(sizeFormSchema.safeParse({ label: "M", sortOrder: "1.5" }).success).toBe(false);
  });
});

describe("coupon schema", () => {
  const base = {
    code: "summer",
    description: "",
    discountType: "FIXED",
    discountValue: "5",
    minOrderAmount: "0",
    maxDiscountAmount: "",
    maxUses: "100",
    startsAt: "2030-01-01T00:00",
    endsAt: "2030-02-01T00:00",
    isActive: true,
    usedCount: "0",
  };

  it("uppercases the code and coerces the numbers", () => {
    const result = couponFormSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.code).toBe("SUMMER");
    expect(result.data.discountValue).toBe(5);
    expect(result.data.maxDiscountAmount).toBeNull();
  });

  it("turns a datetime-local value into an ISO timestamp pinned to UTC", () => {
    const result = couponFormSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.startsAt).toBe("2030-01-01T00:00:00.000Z");
  });

  it("rejects a percentage above 100", () => {
    const result = couponFormSchema.safeParse({
      ...base,
      discountType: "PERCENT",
      discountValue: "101",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an end before the start", () => {
    const result = couponFormSchema.safeParse({
      ...base,
      startsAt: "2030-03-01T00:00",
      endsAt: "2030-02-01T00:00",
    });
    expect(result.success).toBe(false);
  });
});

describe("order status schema", () => {
  it("accepts every documented status", () => {
    for (const status of ["PENDING", "CONFIRMED", "SHIPPING", "DELIVERED", "CANCELLED"]) {
      expect(orderStatusSchema.safeParse(status).success).toBe(true);
    }
  });

  it("rejects anything else", () => {
    expect(orderStatusSchema.safeParse("SHIPPED").success).toBe(false);
  });
});

describe("product schema", () => {
  const product = {
    name: "Linen Shirt",
    slug: "linen-shirt",
    description: "",
    price: "80",
    salePrice: "",
    saleStartsAt: "",
    saleEndsAt: "",
    categoryId: "cat-1",
    collectionId: "col-1",
    isActive: true,
    variants: [{ sizeId: "size-1", colorId: "color-1", sku: "LS-1", stockQuantity: "4" }],
    // A shared image is represented as "" in the form, not null.
    images: [{ colorId: "", url: "https://cdn.test/a.png", altText: "a", sortOrder: "1" }],
  };

  it("coerces price and stock to numbers", () => {
    const result = productFormSchema.safeParse(product);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.price).toBe(80);
    expect(result.data.variants[0].stockQuantity).toBe(4);
    expect(result.data.salePrice).toBeNull();
  });

  it("turns a shared image's empty colour into the domain's null", () => {
    const result = productFormSchema.safeParse(product);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(toProductInput(result.data).images[0].colorId).toBeNull();
  });

  it("rejects a duplicate size and colour combination inside one product", () => {
    const result = productFormSchema.safeParse({
      ...product,
      variants: [
        { sizeId: "size-1", colorId: "color-1", sku: "A", stockQuantity: "1" },
        { sizeId: "size-1", colorId: "color-1", sku: "B", stockQuantity: "1" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a negative price", () => {
    expect(productFormSchema.safeParse({ ...product, price: "-1" }).success).toBe(false);
  });

  it("rejects a sale price that is not below the price", () => {
    expect(
      productFormSchema.safeParse({ ...product, price: "50", salePrice: "50" }).success,
    ).toBe(false);
  });

  it("requires a variant", () => {
    expect(productFormSchema.safeParse({ ...product, variants: [] }).success).toBe(false);
  });

  it("rejects an image url that is not a valid url", () => {
    const result = productFormSchema.safeParse({
      ...product,
      images: [{ colorId: "color-1", url: "not-a-url", altText: "a", sortOrder: "1" }],
    });
    expect(result.success).toBe(false);
  });
});

describe("toProductFormDefaultValues", () => {
  const stored = {
    id: "prod-1",
    name: "Linen Shirt",
    slug: "linen-shirt",
    description: "",
    price: 80,
    salePrice: null,
    saleStartsAt: null,
    saleEndsAt: null,
    categoryId: "cat-1",
    collectionId: "col-1",
    isActive: true,
    createdAt: "2025-01-01T00:00:00.000Z",
    variants: [
      { id: "var-1", productId: "prod-1", sizeId: "size-1", colorId: "color-1", sku: "LS-1", stockQuantity: 4 },
    ],
    images: [
      { id: "img-1", productId: "prod-1", colorId: null, url: "https://cdn.test/a.png", altText: "a", sortOrder: 1 },
    ],
  } satisfies Product;

  it("renders numbers and dates as the strings the inputs expect", () => {
    const defaults = toProductFormDefaultValues(stored);
    expect(defaults.price).toBe("80");
    expect(defaults.salePrice).toBe("");
    expect(defaults.variants[0].stockQuantity).toBe("4");
    // Round-trips straight back through the schema.
    expect(productFormSchema.safeParse(defaults).success).toBe(true);
  });

  it("creates one blank variant row for a new product", () => {
    const defaults = toProductFormDefaultValues(null);
    expect(defaults.variants).toHaveLength(1);
    expect(defaults.price).toBe("");
    expect(productFormSchema.safeParse(defaults).success).toBe(false);
  });
});