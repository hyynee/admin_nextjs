import type { Order, OrderItem, OrderStatus } from "@/types";
import { computeOrderTotal, round2, sumOrderItems } from "@/lib/utils/order";
import { seedProducts } from "./products";
import { seedSizes } from "./sizes";
import { seedColors } from "./colors";
import { seedUsers } from "./users";
import { seedCoupons } from "./coupons";
import { createRandom } from "./helpers";

const STATUS_CYCLE: readonly OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "SHIPPING",
  "DELIVERED",
  "CANCELLED",
] as const;

const SHIPPING_FEES = [0, 12, 12, 18, 25] as const;

export function seedOrders(): Order[] {
  const products = seedProducts();
  const sizes = seedSizes();
  const colors = seedColors();
  const users = seedUsers();
  const coupons = seedCoupons();

  return Array.from({ length: 14 }, (_, index) => {
    const random = createRandom(index + 31);
    const id = `order-${index + 1}`;
    const user = users[index % users.length];
    const status = STATUS_CYCLE[index % STATUS_CYCLE.length];

    const itemCount = 1 + Math.floor(random() * 3);
    const items: OrderItem[] = Array.from({ length: itemCount }, (_, itemIndex) => {
      const product = products[(index * 3 + itemIndex * 5) % products.length];
      const variant = product.variants[(index + itemIndex) % product.variants.length];
      const size = sizes.find((item) => item.id === variant.sizeId);
      const color = colors.find((item) => item.id === variant.colorId);
      return {
        id: `${id}-item-${itemIndex + 1}`,
        productId: product.id,
        // Snapshot values: renaming the product later must not rewrite history.
        productName: product.name,
        sizeLabel: size?.label ?? "-",
        colorName: color?.name ?? "-",
        unitPrice: product.salePrice ?? product.price,
        qty: 1 + Math.floor(random() * 3),
      };
    });

    const subtotal = sumOrderItems(items);
    const withCoupon = index % 3 === 0;
    const coupon = withCoupon ? coupons[index % coupons.length] : undefined;
    const discount = coupon
      ? round2(
          coupon.discountType === "PERCENT"
            ? Math.min(
                subtotal * (coupon.discountValue / 100),
                coupon.maxDiscountAmount ?? Number.POSITIVE_INFINITY,
              )
            : Math.min(coupon.discountValue, subtotal),
        )
      : 0;
    const shippingFee = SHIPPING_FEES[index % SHIPPING_FEES.length];

    return {
      id,
      orderCode: `NS-${String(1048 - index).padStart(5, "0")}`,
      createdAt: new Date(Date.UTC(2024, 9, 14 - index, 10, 30, 0)).toISOString(),
      status,
      userId: user.id,
      recipientName: user.fullName,
      recipientPhone: user.phone,
      shippingAddress: `${user.addresses[0].line1}, ${user.addresses[0].city}`,
      couponCode: coupon?.code ?? null,
      items,
      subtotal,
      discount,
      shippingFee,
      total: computeOrderTotal(subtotal, discount, shippingFee),
      payment: {
        method: index % 2 === 0 ? "CARD" : "PAYPAL",
        status: status === "CANCELLED" ? "REFUNDED" : "PAID",
        transactionId: `txn_${1000 + index}`,
        paidAt: status === "PENDING" ? null : new Date(Date.UTC(2024, 9, 14 - index, 10, 35, 0)).toISOString(),
      },
    };
  });
}
