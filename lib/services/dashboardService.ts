import type { Order, OrderStatus } from "@/types";
import { db } from "@/lib/mock";
import { LOW_STOCK_THRESHOLD } from "@/lib/mock";
import { isRevenueBearingStatus, round2 } from "@/lib/utils/order";
import { totalStock } from "@/lib/utils/variant";
import { clone, delay } from "./query";

export type LowStockRow = {
  productId: string;
  productName: string;
  slug: string;
  sku: string;
  sizeLabel: string;
  colorName: string;
  stockQuantity: number;
  thumbnail: string | null;
};

export type DashboardSummary = {
  totals: {
    users: number;
    products: number;
    categories: number;
    orders: number;
    /** Cancelled orders are excluded. */
    revenue: number;
  };
  ordersByStatus: Array<{ status: OrderStatus; count: number }>;
  recentOrders: Order[];
  lowStock: LowStockRow[];
  activeCoupons: number;
  totalUnits: number;
};

const STATUS_ORDER: readonly OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "SHIPPING",
  "DELIVERED",
  "CANCELLED",
] as const;

export const dashboardService = {
  async getSummary(): Promise<DashboardSummary> {
    await delay(200);

    const ordersByStatus = STATUS_ORDER.map((status) => ({
      status,
      count: db.orders.filter((order) => order.status === status).length,
    }));

    const lowStock: LowStockRow[] = [];
    for (const product of db.products) {
      for (const variant of product.variants) {
        if (variant.stockQuantity >= LOW_STOCK_THRESHOLD) continue;
        const size = db.sizes.find((row) => row.id === variant.sizeId);
        const color = db.colors.find((row) => row.id === variant.colorId);
        lowStock.push({
          productId: product.id,
          productName: product.name,
          slug: product.slug,
          sku: variant.sku,
          sizeLabel: size?.label ?? "-",
          colorName: color?.name ?? "-",
          stockQuantity: variant.stockQuantity,
          thumbnail: product.images[0]?.url ?? null,
        });
      }
    }
    lowStock.sort((a, b) => a.stockQuantity - b.stockQuantity);

    const recentOrders = [...db.orders]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 6)
      .map((order) => clone(order));

    const revenue = round2(
      db.orders
        .filter((order) => isRevenueBearingStatus(order.status))
        .reduce((sum, order) => sum + order.total, 0),
    );

    return {
      totals: {
        users: db.users.length,
        products: db.products.length,
        categories: db.categories.length,
        orders: db.orders.length,
        revenue,
      },
      ordersByStatus,
      recentOrders,
      lowStock: lowStock.slice(0, 8),
      activeCoupons: db.coupons.filter((coupon) => coupon.isActive).length,
      totalUnits: db.products.reduce((sum, product) => sum + totalStock(product.variants), 0),
    };
  },

  async getLowStock(): Promise<LowStockRow[]> {
    const summary = await dashboardService.getSummary();
    return summary.lowStock;
  },
};
