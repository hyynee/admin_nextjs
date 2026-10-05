export type Category = {
  id: string;
  name: string;
  slug: string;
};

export type Collection = {
  id: string;
  name: string;
  slug: string;
  season: string;
  year: number;
  description: string;
  bannerUrl: string;
  startsAt: string;
  isActive: boolean;
};

export type Size = {
  id: string;
  label: string;
  sortOrder: number;
};

export type Color = {
  id: string;
  name: string;
  hexCode: string;
};

export type CategoryInput = Pick<Category, "name" | "slug">;

export type CollectionInput = Omit<Collection, "id">;

export type SizeInput = Pick<Size, "label" | "sortOrder">;

export type ColorInput = Pick<Color, "name" | "hexCode">;
