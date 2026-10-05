import type { Coupon } from "@/types";

type Seed = {
  code: string;
  description: string;
  discountType: Coupon["discountType"];
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
  maxUses: number;
  usedCount: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

const SEEDS: readonly Seed[] = [
  {
    code: "WELCOME10",
    description: "Ten percent off a first order for new accounts.",
    discountType: "PERCENT",
    discountValue: 10,
    minOrderAmount: 50,
    maxDiscountAmount: 40,
    maxUses: 1000,
    usedCount: 214,
    startsAt: "2024-01-01T00:00:00.000Z",
    endsAt: "2025-12-31T00:00:00.000Z",
    isActive: true,
  },
  {
    code: "FALL25",
    description: "Twenty five percent off the Autumn Signal collection.",
    discountType: "PERCENT",
    discountValue: 25,
    minOrderAmount: 120,
    maxDiscountAmount: 120,
    maxUses: 400,
    usedCount: 168,
    startsAt: "2024-09-01T00:00:00.000Z",
    endsAt: "2024-12-01T00:00:00.000Z",
    isActive: true,
  },
  {
    code: "STUDIO15",
    description: "Fifteen dollars off orders over one hundred fifty.",
    discountType: "FIXED",
    discountValue: 15,
    minOrderAmount: 150,
    maxDiscountAmount: null,
    maxUses: 800,
    usedCount: 92,
    startsAt: "2024-03-01T00:00:00.000Z",
    endsAt: "2025-06-30T00:00:00.000Z",
    isActive: true,
  },
  {
    code: "FIRSTORDER",
    description: "Flat twenty off for the very first order.",
    discountType: "FIXED",
    discountValue: 20,
    minOrderAmount: 80,
    maxDiscountAmount: null,
    maxUses: 500,
    usedCount: 431,
    startsAt: "2024-02-01T00:00:00.000Z",
    endsAt: "2025-01-31T00:00:00.000Z",
    isActive: true,
  },
  {
    code: "MEMBER20",
    description: "Twenty percent off for members. Expired campaign.",
    discountType: "PERCENT",
    discountValue: 20,
    minOrderAmount: 100,
    maxDiscountAmount: 80,
    maxUses: 250,
    usedCount: 250,
    startsAt: "2024-01-01T00:00:00.000Z",
    endsAt: "2024-04-30T00:00:00.000Z",
    isActive: false,
  },
];

export function seedCoupons(): Coupon[] {
  return SEEDS.map((seed, index) => ({ id: `coupon-${index + 1}`, ...seed }));
}
