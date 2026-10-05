import type {
  ListParams,
  ListResult,
  Order,
  OrderStatus,
} from "@/types";
import { db } from "@/lib/mock";
import { isValidStatusTransition } from "@/lib/utils/order";
import { NotFoundError, ServiceError } from "./errors";
import { clone, delay, matchesSearch, queryList } from "./query";

function findIndex(id: string): number {
  return db.orders.findIndex((row) => row.id === id);
}

export const orderService = {
  async list(params: ListParams = {}): Promise<ListResult<Order>> {
    await delay();
    return queryList(db.orders, params, {
      // Requirement: search by order code or customer name.
      search: (row, needle) =>
        matchesSearch([row.orderCode, row.recipientName, row.recipientPhone], needle),
      filter: (row, filters) => {
        if (filters.status && row.status !== filters.status) return false;
        if (filters.userId && row.userId !== filters.userId) return false;
        if (filters.hasCoupon === "true" && row.couponCode === null) return false;
        if (filters.hasCoupon === "false" && row.couponCode !== null) return false;
        return true;
      },
      defaultSort: "createdAt",
    });
  },

  async get(id: string): Promise<Order | null> {
    await delay();
    const row = db.orders.find((item) => item.id === id);
    return row ? clone(row) : null;
  },

  /**
   * Status is the only mutable field, and only along the documented flow:
   * PENDING -> CONFIRMED -> SHIPPING -> DELIVERED, or -> CANCELLED from any
   * non-terminal state.
   */
  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    await delay();
    const index = findIndex(id);
    if (index === -1) throw new NotFoundError("Order not found");
    const current = db.orders[index];
    if (current.status === status) {
      throw new ServiceError(`Order is already ${status}`);
    }
    if (!isValidStatusTransition(current.status, status)) {
      throw new ServiceError(`Cannot move an order from ${current.status} to ${status}`);
    }
    const updated: Order = {
      ...current,
      status,
      payment: {
        ...current.payment,
        paidAt:
          status === "CONFIRMED" && current.payment.paidAt === null
            ? new Date().toISOString()
            : current.payment.paidAt,
      },
    };
    db.orders[index] = updated;
    return clone(updated);
  },

  /** Order history for the user detail page. */
  async listByUser(userId: string, params: ListParams = {}): Promise<ListResult<Order>> {
    return orderService.list({ ...params, filters: { ...params.filters, userId } });
  },
};
