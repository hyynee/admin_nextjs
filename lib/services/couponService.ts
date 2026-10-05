import type { Coupon, CouponInput, ListParams, ListResult } from "@/types";
import { db } from "@/lib/mock";
import { nextId } from "@/lib/mock/helpers";
import { NotFoundError, ServiceError } from "./errors";
import { clone, delay, matchesSearch, queryList } from "./query";

function findIndex(id: string): number {
  return db.coupons.findIndex((row) => row.id === id);
}

function assertUniqueCode(code: string, ignoreId?: string): void {
  if (db.coupons.some((row) => row.code === code && row.id !== ignoreId)) {
    throw new ServiceError(`Coupon "${code}" already exists`, {
      fields: { code: "This code already exists" },
    });
  }
}

function assertValid(input: CouponInput): void {
  if (input.discountType === "PERCENT" && (input.discountValue < 0 || input.discountValue > 100)) {
    throw new ServiceError("A percentage discount must be between 0 and 100", {
      fields: { discountValue: "Must be between 0 and 100" },
    });
  }
  if (new Date(input.endsAt) <= new Date(input.startsAt)) {
    throw new ServiceError("End date must be after the start date", {
      fields: { endsAt: "End date must be after the start date" },
    });
  }
  if (
    input.maxDiscountAmount !== null &&
    input.discountType === "FIXED" &&
    input.maxDiscountAmount < input.discountValue
  ) {
    throw new ServiceError("Maximum discount cannot be lower than the discount value", {
      fields: { maxDiscountAmount: "Cannot be lower than the discount value" },
    });
  }
}

export const couponService = {
  async list(params: ListParams = {}): Promise<ListResult<Coupon>> {
    await delay();
    return queryList(db.coupons, params, {
      search: (row, needle) => matchesSearch([row.code, row.description], needle),
      filter: (row, filters) => {
        if (filters.discountType && row.discountType !== filters.discountType) return false;
        if (filters.isActive === "true" && !row.isActive) return false;
        if (filters.isActive === "false" && row.isActive) return false;
        return true;
      },
      defaultSort: "code",
    });
  },

  async get(id: string): Promise<Coupon | null> {
    await delay();
    const row = db.coupons.find((item) => item.id === id);
    return row ? clone(row) : null;
  },

  async create(input: CouponInput): Promise<Coupon> {
    await delay();
    // Normalised here, not only in the form: the service owns the invariant, so
    // a lowercase code cannot reach storage by any other route.
    const normalized: CouponInput = { ...input, code: input.code.trim().toUpperCase() };
    assertUniqueCode(normalized.code);
    assertValid(normalized);
    // usedCount always starts at zero and is never client-supplied.
    const row: Coupon = { id: nextId("coupon"), usedCount: 0, ...normalized };
    db.coupons.push(row);
    return clone(row);
  },

  async update(id: string, input: CouponInput): Promise<Coupon> {
    await delay();
    const index = findIndex(id);
    if (index === -1) throw new NotFoundError("Coupon not found");
    const normalized: CouponInput = { ...input, code: input.code.trim().toUpperCase() };
    assertUniqueCode(normalized.code, id);
    assertValid(normalized);
    // `usedCount` is deliberately preserved across updates.
    const updated: Coupon = {
      ...db.coupons[index],
      ...normalized,
      usedCount: db.coupons[index].usedCount,
    };
    db.coupons[index] = updated;
    return clone(updated);
  },

  async remove(id: string): Promise<void> {
    await delay();
    const index = findIndex(id);
    if (index === -1) throw new NotFoundError("Coupon not found");
    db.coupons.splice(index, 1);
  },
};
