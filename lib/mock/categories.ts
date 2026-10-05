import type { Category } from "@/types";
import { slugify } from "@/lib/utils";

const NAMES = [
  "Outerwear",
  "Tops",
  "Bottoms",
  "Accessories",
  "Footwear",
  "Knitwear",
] as const;

export function seedCategories(): Category[] {
  return NAMES.map((name, index) => ({
    id: `cat-${index + 1}`,
    name,
    slug: slugify(name),
  }));
}
