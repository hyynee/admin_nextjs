import { describe, expect, it } from "vitest";
import { formatCurrency, formatDate, slugify, toDateTimeLocalValue } from "@/lib/utils";
import {
  allowedStatusTransitions,
  computeOrderTotal,
  isOrderStatus,
  isRevenueBearingStatus,
  isValidStatusTransition,
  round2,
} from "@/lib/utils/order";
import {
  formatList,
  formatOrderStatus,
  formatRole,
  humanizeEnum,
} from "@/lib/utils/label";
import {
  findDuplicateVariantIndex,
  isDuplicateVariant,
  lowestStock,
  totalStock,
} from "@/lib/utils/variant";

describe("money formatting", () => {
  it("renders a stable USD amount with no trailing noise", () => {
    expect(formatCurrency(1234.5)).toBe("$1,234.50");
    expect(formatCurrency(89.5)).toBe("$89.50");
    expect(formatCurrency(1200)).toBe("$1,200.00");
  });

  it("shows an em dash for a missing amount, so a null price never reads as free", () => {
    expect(formatCurrency(null)).toBe("\u2014");
    expect(formatCurrency(undefined)).toBe("\u2014");
    expect(formatCurrency(Number.NaN)).toBe("\u2014");
  });
});

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Linen Summer Shirt")).toBe("linen-summer-shirt");
  });

  it("collapses runs of separators and trims the edges", () => {
    expect(slugify("  Trailing /// Slashes  ")).toBe("trailing-slashes");
  });

  it("strips punctuation", () => {
    expect(slugify("T-Shirt (New)!")).toBe("t-shirt-new");
  });

  it("returns an empty string when nothing survives", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("date formatting", () => {
  it("formats a UTC timestamp deterministically", () => {
    expect(formatDate("2025-03-04T10:00:00.000Z")).toBe("Mar 4, 2025");
  });

  it("renders nothing for absent dates", () => {
    expect(formatDate(null)).toBe("—");
  });

  it("round-trips through the datetime-local value used by inputs", () => {
    expect(toDateTimeLocalValue("2025-03-04T10:30:00.000Z")).toBe("2025-03-04T10:30");
  });
});

describe("order totals", () => {
  it("is subtotal minus discount plus shipping", () => {
    expect(computeOrderTotal(100, 10, 5)).toBe(95);
  });

  it("rounds to two decimals to avoid float drift", () => {
    expect(computeOrderTotal(0.1, 0, 0.2)).toBe(0.3);
  });

  it("treats a free order correctly", () => {
    expect(computeOrderTotal(50, 0, 0)).toBe(50);
  });
});

describe("order status flow", () => {
  it("allows only the next step forward", () => {
    expect(isValidStatusTransition("PENDING", "CONFIRMED")).toBe(true);
    expect(isValidStatusTransition("CONFIRMED", "SHIPPING")).toBe(true);
    expect(isValidStatusTransition("SHIPPING", "DELIVERED")).toBe(true);
  });

  it("refuses to skip a step", () => {
    expect(isValidStatusTransition("PENDING", "SHIPPING")).toBe(false);
    expect(isValidStatusTransition("PENDING", "DELIVERED")).toBe(false);
  });

  it("refuses to move backwards", () => {
    expect(isValidStatusTransition("DELIVERED", "SHIPPING")).toBe(false);
    expect(isValidStatusTransition("CONFIRMED", "PENDING")).toBe(false);
  });

  it("refuses a no-op transition", () => {
    expect(isValidStatusTransition("SHIPPING", "SHIPPING")).toBe(false);
  });

  it("cancels from any non-terminal status but never from DELIVERED", () => {
    expect(isValidStatusTransition("PENDING", "CANCELLED")).toBe(true);
    expect(isValidStatusTransition("SHIPPING", "CANCELLED")).toBe(true);
    expect(isValidStatusTransition("DELIVERED", "CANCELLED")).toBe(false);
  });

  it("lists exactly the reachable statuses", () => {
    expect(allowedStatusTransitions("PENDING")).toEqual(["CONFIRMED", "CANCELLED"]);
    expect(allowedStatusTransitions("DELIVERED")).toEqual([]);
  });

  it("recognises every valid status string", () => {
    expect(isOrderStatus("SHIPPING")).toBe(true);
    expect(isOrderStatus("shipped")).toBe(false);
  });

  it("excludes cancelled orders from revenue", () => {
    expect(isRevenueBearingStatus("DELIVERED")).toBe(true);
    expect(isRevenueBearingStatus("CANCELLED")).toBe(false);
  });
});

describe("variant stock", () => {
  const variants = [
    { id: "v1", sizeId: "s", colorId: "c1" },
    { id: "v2", sizeId: "m", colorId: "c1" },
    { id: "v3", sizeId: "s", colorId: "c1" },
  ];

  it("detects a duplicate size and colour combination", () => {
    expect(isDuplicateVariant(variants, { sizeId: "s", colorId: "c1" })).toBe(true);
    expect(isDuplicateVariant(variants, { sizeId: "l", colorId: "c1" })).toBe(false);
  });

  it("ignores the row being edited, but still catches a real collision", () => {
    // v3 still collides with v1, so ignoring one row must not hide the duplicate.
    expect(isDuplicateVariant(variants, { sizeId: "s", colorId: "c1" }, "v1")).toBe(true);

    const unique = [
      { id: "v1", sizeId: "s", colorId: "c1" },
      { id: "v2", sizeId: "m", colorId: "c1" },
    ];
    expect(isDuplicateVariant(unique, { sizeId: "s", colorId: "c1" }, "v1")).toBe(false);
  });

  it("points at the first offending row", () => {
    expect(findDuplicateVariantIndex(variants, { sizeId: "s", colorId: "c1" })).toBe(0);
    expect(findDuplicateVariantIndex(variants, { sizeId: "l", colorId: "c9" })).toBe(-1);
  });

  it("sums and minimises stock", () => {
    const stock = [{ stockQuantity: 4 }, { stockQuantity: 0 }, { stockQuantity: 9 }];
    expect(totalStock(stock)).toBe(13);
    expect(lowestStock(stock)).toBe(0);
  });

  it("reports zero for a product with no variants", () => {
    expect(totalStock([])).toBe(0);
    expect(lowestStock([])).toBe(0);
  });
});

describe("round2", () => {
  it("avoids the classic 1.005 rounding error", () => {
    expect(round2(1.005)).toBe(1.01);
  });
});

describe("human-readable enum labels", () => {
  it("humanizes screaming-snake constants", () => {
    expect(humanizeEnum("PENDING")).toBe("Pending");
    expect(humanizeEnum("BANK_TRANSFER")).toBe("Bank transfer");
    expect(humanizeEnum("IN_PROGRESS")).toBe("In progress");
  });

  it("humanizes camelCase and dashed values", () => {
    expect(humanizeEnum("partiallyRefunded")).toBe("Partially refunded");
    expect(humanizeEnum("out-of-stock")).toBe("Out of stock");
  });

  it("leaves values it cannot interpret untouched", () => {
    expect(humanizeEnum("")).toBe("");
    expect(humanizeEnum("2")).toBe("2");
    // Never returns an empty string for real input, so labels are never blank.
    expect(humanizeEnum("  ")).toBe("  ");
  });

  it("uses team wording for order statuses", () => {
    expect(formatOrderStatus("PENDING")).toBe("Pending");
    expect(formatOrderStatus("SHIPPING")).toBe("Shipping");
    expect(formatOrderStatus("CANCELLED")).toBe("Cancelled");
  });

  it("falls back to a readable label for an unknown status", () => {
    expect(formatOrderStatus("REFUNDED")).toBe("Refunded");
    expect(formatRole("STORE_MANAGER")).toBe("Store manager");
    expect(formatRole("ADMIN")).toBe("Admin");
  });

  it("never leaks the raw constant into a label", () => {
    for (const status of ["PENDING", "CONFIRMED", "SHIPPING", "DELIVERED", "CANCELLED"]) {
      expect(formatOrderStatus(status)).not.toBe(status);
      expect(formatOrderStatus(status)).not.toContain("_");
    }
  });
});

describe("formatList", () => {
  it("handles the degenerate and simple cases", () => {
    expect(formatList([])).toBe("none");
    expect(formatList(["Confirmed"])).toBe("Confirmed");
  });

  it("joins two with 'and'", () => {
    expect(formatList(["Confirmed", "Cancelled"])).toBe("Confirmed and Cancelled");
  });

  it("uses a comma list before the final 'and'", () => {
    expect(formatList(["Confirmed", "Shipping", "Cancelled"])).toBe(
      "Confirmed, Shipping and Cancelled",
    );
  });
});
