import type {
  Category,
  Collection,
  Color,
  Coupon,
  Order,
  Product,
  Size,
  User,
} from "@/types";
import { seedCategories } from "./categories";
import { seedCollections } from "./collections";
import { seedSizes } from "./sizes";
import { seedColors } from "./colors";
import { seedProducts } from "./products";
import { seedUsers } from "./users";
import { seedCoupons } from "./coupons";
import { seedOrders } from "./orders";

export type MockDatabase = {
  categories: Category[];
  collections: Collection[];
  sizes: Size[];
  colors: Color[];
  products: Product[];
  users: User[];
  coupons: Coupon[];
  orders: Order[];
};

export function createSeedDatabase(): MockDatabase {
  return {
    categories: seedCategories(),
    collections: seedCollections(),
    sizes: seedSizes(),
    colors: seedColors(),
    products: seedProducts(),
    users: seedUsers(),
    coupons: seedCoupons(),
    orders: seedOrders(),
  };
}

/**
 * The single mutable in-memory store. Every service reads and writes here, so
 * a create/update/delete performed in the admin UI is immediately visible to
 * subsequent reads.
 *
 * This lives in module scope on purpose: replacing `lib/services/*` with real
 * `fetch` calls is the only change needed to move to a real API.
 */
export const db: MockDatabase = createSeedDatabase();

/** Test helper: restore pristine seed data. */
export function resetDatabase(): void {
  const fresh = createSeedDatabase();
  db.categories = fresh.categories;
  db.collections = fresh.collections;
  db.sizes = fresh.sizes;
  db.colors = fresh.colors;
  db.products = fresh.products;
  db.users = fresh.users;
  db.coupons = fresh.coupons;
  db.orders = fresh.orders;
}

export { LOW_STOCK_THRESHOLD } from "./products";
