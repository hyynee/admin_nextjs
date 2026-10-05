import type { Product } from "@/types";
import { slugify } from "@/lib/utils";
import { seedCategories } from "./categories";
import { seedCollections } from "./collections";
import { seedColors } from "./colors";
import { seedSizes } from "./sizes";
import { createRandom, pick } from "./helpers";

const NAMES = [
  "Field Jacket",
  "Loopback Crew",
  "Pleated Trouser",
  "Canvas Tote",
  "Transit Sneaker",
  "Ribbed Polo",
  "Work Shirt",
  "Utility Vest",
  "Daily Cap",
  "Linen Overshirt",
  "Studio Hoodie",
  "Cropped Chino",
  "Frame Sunglasses",
  "Cloud Runner",
  "Heavyweight Tee",
  "Signal Cardigan",
  "Relaxed Denim",
  "Zip Pouch",
  "Ridge Sandal",
  "Merino Beanie",
] as const;

const PHOTOS = [
  "1529139574466-a8c07d2c90a1",
  "1515886657613-2c07d1b0f5b1",
  "1490481651871-ab68de25d43d",
  "1551488831-220d9b3c1b2f",
] as const;

/** Low-stock threshold used by the dashboard. Mirrors the requirement. */
export const LOW_STOCK_THRESHOLD = 10;

export function seedProducts(): Product[] {
  const categories = seedCategories();
  const collections = seedCollections();
  const sizes = seedSizes();
  const colors = seedColors();

  return NAMES.map((name, index) => {
    const random = createRandom(index + 7);
    const id = `prod-${index + 1}`;

    // Always >= 3 variants, drawn from distinct size + color pairs so the
    // (productId, sizeId, colorId) uniqueness rule holds in the seed data.
    const variantCount = 3 + Math.floor(random() * 3);
    const variants = Array.from({ length: variantCount }, (_, variantIndex) => {
      const size = sizes[(index + variantIndex) % sizes.length];
      const color = colors[(index * 2 + variantIndex) % colors.length];
      return {
        id: `${id}-var-${variantIndex + 1}`,
        productId: id,
        sizeId: size.id,
        colorId: color.id,
        sku: `${slugify(name).slice(0, 3).toUpperCase()}-${String(index + 1).padStart(3, "0")}-${size.label}-${color.id.replace("color-", "C")}`,
        // Keeps a healthy mix above and below LOW_STOCK_THRESHOLD.
        stockQuantity: Math.floor(random() * 24),
      };
    });

    const onSale = index % 4 === 0;
    const price = 68 + index * 11;

    const images = [
      {
        id: `${id}-image-1`,
        productId: id,
        // Shared across every colour.
        colorId: null,
        url: `https://images.unsplash.com/photo-${PHOTOS[index % PHOTOS.length]}?auto=format&fit=crop&w=900&q=70`,
        altText: `${name} front view`,
        sortOrder: 1,
      },
      {
        id: `${id}-image-2`,
        productId: id,
        colorId: variants[0]?.colorId ?? null,
        url: `https://images.unsplash.com/photo-${PHOTOS[(index + 1) % PHOTOS.length]}?auto=format&fit=crop&w=900&q=70`,
        altText: `${name} detail`,
        sortOrder: 2,
      },
    ];

    return {
      id,
      name,
      slug: slugify(name),
      description: `A precise, everyday ${name.toLowerCase()} cut from durable cloth and finished for repeat wear.`,
      price,
      salePrice: onSale ? Math.round(price * 0.8) : null,
      saleStartsAt: onSale ? "2024-10-01T00:00:00.000Z" : null,
      saleEndsAt: onSale ? "2025-01-15T00:00:00.000Z" : null,
      categoryId: pick(random, categories).id,
      collectionId: collections[index % collections.length].id,
      isActive: index !== 17,
      createdAt: new Date(Date.UTC(2024, index % 9, 3 + (index % 24), 9, 0, 0)).toISOString(),
      variants,
      images,
    };
  });
}
