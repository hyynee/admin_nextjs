import type { ListParams, ListResult, Role, User } from "@/types";
import { db } from "@/lib/mock";
import { ServiceError } from "./errors";
import { clone, delay, matchesSearch, queryList } from "./query";

export type UserStats = {
  orderCount: number;
  lifetimeSpend: number;
  pendingCount: number;
};

function findIndex(id: string): number {
  return db.users.findIndex((row) => row.id === id);
}

export const userService = {
  async list(params: ListParams = {}): Promise<ListResult<User>> {
    await delay();
    return queryList(db.users, params, {
      search: (row, needle) => matchesSearch([row.email, row.fullName, row.phone], needle),
      filter: (row, filters) => {
        if (filters.role && row.role !== filters.role) return false;
        return true;
      },
      defaultSort: "fullName",
    });
  },

  async get(id: string): Promise<User | null> {
    await delay();
    const row = db.users.find((item) => item.id === id);
    return row ? clone(row) : null;
  },

  /**
   * Order-derived figures for the detail page. Cancelled orders are excluded
   * from spend, matching the dashboard's revenue rule.
   */
  async stats(id: string): Promise<UserStats> {
    await delay();
    const user = db.users.find((item) => item.id === id);
    if (!user) throw new ServiceError("User not found", { status: 404 });
    const orders = db.orders.filter((order) => order.userId === id);
    const counted = orders.filter((order) => order.status !== "CANCELLED");
    return {
      orderCount: orders.length,
      lifetimeSpend: counted.reduce((sum, order) => sum + order.total, 0),
      pendingCount: orders.filter((order) => order.status === "PENDING").length,
    };
  },

  /**
   * Role is the only mutable field. Addresses are intentionally read-only:
   * the admin must not edit a customer's address.
   */
  async updateRole(id: string, role: Role): Promise<User> {
    await delay();
    const index = findIndex(id);
    if (index === -1) throw new ServiceError("User not found", { status: 404 });
    const current = db.users[index];
    if (current.role === role) {
      throw new ServiceError(`Role is already ${role}`);
    }
    const updated: User = { ...current, role };
    db.users[index] = updated;
    return clone(updated);
  },
};
