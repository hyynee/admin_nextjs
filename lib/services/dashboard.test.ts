import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/mock";
import { dashboardService } from "@/lib/services";
import { ORDER_STATUSES } from "@/types";

/**
 * The dashboard is the one page with no list to eyeball, so its arithmetic is
 * pinned here: each figure is recomputed straight from the store and compared
 * with what the service reports. Cancelled orders must never reach revenue.
 */
function seedOrders() {
  db.orders = JSON.parse(JSON.stringify(seedOrdersSnapshot));
}

const seedOrdersSnapshot = JSON.parse(JSON.stringify(db.orders));

const cents = (value: number) => Math.round(value * 100) / 100;

describe("dashboardService.getSummary", () => {
  beforeEach(seedOrders);

  it("counts what the store actually holds", async () => {
    const { totals } = await dashboardService.getSummary();

    expect(totals.users).toBe(db.users.length);
    expect(totals.products).toBe(db.products.length);
    expect(totals.categories).toBe(db.categories.length);
    expect(totals.orders).toBe(db.orders.length);
  });

  it("excludes cancelled orders from revenue", async () => {
    const { totals } = await dashboardService.getSummary();

    const expected = cents(
      db.orders
        .filter((order) => order.status !== "CANCELLED")
        .reduce((sum, order) => sum + order.total, 0),
    );
    expect(totals.revenue).toBe(expected);

    // Guard the guard: the fixture must actually contain a cancelled order,
    // otherwise this test would pass even if the filter were removed.
    const cancelled = db.orders.filter((order) => order.status === "CANCELLED");
    expect(cancelled.length).toBeGreaterThan(0);

    const withoutFilter = cents(
      db.orders.reduce((sum, order) => sum + order.total, 0),
    );
    expect(totals.revenue).not.toBe(withoutFilter);
    expect(totals.revenue).toBeLessThan(withoutFilter);
  });

  it("counts orders per status, with one row per status", async () => {
    const { ordersByStatus } = await dashboardService.getSummary();

    expect(ordersByStatus.map((row) => row.status)).toEqual(ORDER_STATUSES);
    for (const row of ordersByStatus) {
      expect(row.count).toBe(db.orders.filter((order) => order.status === row.status).length);
    }
    expect(ordersByStatus.reduce((sum, row) => sum + row.count, 0)).toBe(db.orders.length);
  });

  it("reports low stock as the variants under the threshold, worst first", async () => {
    const { lowStock } = await dashboardService.getSummary();

    const expected = db.products
      .flatMap((product) =>
        product.variants
          .filter((variant) => variant.stockQuantity < 5)
          .map((variant) => variant.stockQuantity),
      )
      .sort((a, b) => a - b)
      .slice(0, 8);

    expect(lowStock.map((row) => row.stockQuantity)).toEqual(expected);
    for (let i = 1; i < lowStock.length; i += 1) {
      expect(lowStock[i - 1]!.stockQuantity).toBeLessThanOrEqual(lowStock[i]!.stockQuantity);
    }
    // Never a zero-stock row: a sold-out variant is the most urgent thing to show.
    expect(lowStock.some((row) => row.stockQuantity === 0)).toBe(true);
  });

  it("returns the newest orders first, capped at six", async () => {
    const { recentOrders } = await dashboardService.getSummary();

    expect(recentOrders).toHaveLength(Math.min(6, db.orders.length));
    const stamps = recentOrders.map((order) => order.createdAt);
    expect([...stamps].sort((a, b) => b.localeCompare(a))).toEqual(stamps);
  });

  it("counts only active coupons", async () => {
    const { activeCoupons } = await dashboardService.getSummary();
    expect(activeCoupons).toBe(db.coupons.filter((coupon) => coupon.isActive).length);
  });

  it("sums units across every variant", async () => {
    const { totalUnits } = await dashboardService.getSummary();
    const expected = db.products.reduce(
      (sum, product) => sum + product.variants.reduce((s, v) => s + v.stockQuantity, 0),
      0,
    );
    expect(totalUnits).toBe(expected);
  });

  it("does not hand out references into the store", async () => {
    const first = await dashboardService.getSummary();
    first.recentOrders[0]!.status = "CANCELLED";
    first.totals.revenue = 0;

    const second = await dashboardService.getSummary();
    expect(second.recentOrders[0]!.status).not.toBe("CANCELLED");
    expect(second.totals.revenue).toBeGreaterThan(0);
  });
});