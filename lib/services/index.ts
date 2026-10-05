/**
 * The single data boundary between the UI and its data source.
 *
 * Components must import from here and never from `@/lib/mock`. Swapping the
 * mock for a real API means replacing the bodies below with `fetch` calls —
 * no component changes.
 */
export { ServiceError, NotFoundError, ConflictError, isServiceError, errorMessage } from "./errors";
export { categoryService } from "./categoryService";
export { collectionService } from "./collectionService";
export { sizeService } from "./sizeService";
export { colorService } from "./colorService";
export { productService } from "./productService";
export { couponService } from "./couponService";
export { orderService } from "./orderService";
export { userService } from "./userService";
export { dashboardService } from "./dashboardService";
export type { DashboardSummary, LowStockRow } from "./dashboardService";
