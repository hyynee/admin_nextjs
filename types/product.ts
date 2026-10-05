/** Price lives on Product only. Variants never carry a price. */
export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  salePrice: number | null;
  saleStartsAt: string | null;
  saleEndsAt: string | null;
  categoryId: string;
  collectionId: string;
  isActive: boolean;
  createdAt: string;
  variants: Variant[];
  images: ProductImage[];
};

/** No `price` field by design. */
export type Variant = {
  id: string;
  productId: string;
  sizeId: string;
  colorId: string;
  sku: string;
  stockQuantity: number;
};

/** Attached to product + color. `colorId: null` means shared across all colors. */
export type ProductImage = {
  id: string;
  productId: string;
  colorId: string | null;
  url: string;
  altText: string;
  sortOrder: number;
};

export type VariantInput = {
  id?: string;
  sizeId: string;
  colorId: string;
  sku: string;
  stockQuantity: number;
};

export type ProductImageInput = {
  id?: string;
  colorId: string | null;
  url: string;
  altText: string;
  sortOrder: number;
};

export type ProductInput = {
  name: string;
  slug: string;
  description: string;
  price: number;
  salePrice: number | null;
  saleStartsAt: string | null;
  saleEndsAt: string | null;
  categoryId: string;
  collectionId: string;
  isActive: boolean;
  variants: VariantInput[];
  images: ProductImageInput[];
};

/** Reference data the product form needs for its selects. */
export type ProductOptions = {
  categories: Array<{ id: string; name: string }>;
  collections: Array<{ id: string; name: string }>;
  sizes: Array<{ id: string; label: string }>;
  colors: Array<{ id: string; name: string; hexCode: string }>;
};
