import type { Size } from "@/types";

const LABELS = ["XS", "S", "M", "L", "XL", "XXL"] as const;

export function seedSizes(): Size[] {
  return LABELS.map((label, index) => ({
    id: `size-${index + 1}`,
    label,
    sortOrder: index + 1,
  }));
}
