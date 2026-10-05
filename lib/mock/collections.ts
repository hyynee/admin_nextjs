import type { Collection } from "@/types";
import { slugify } from "@/lib/utils";

type Seed = {
  name: string;
  season: string;
  year: number;
  description: string;
  startsAt: string;
  isActive: boolean;
};

const SEEDS: readonly Seed[] = [
  {
    name: "Autumn Signal",
    season: "Autumn",
    year: 2024,
    description: "Layered outerwear and warm knitwear for the turn of the season.",
    startsAt: "2024-09-01T00:00:00.000Z",
    isActive: true,
  },
  {
    name: "Studio Essentials",
    season: "Spring",
    year: 2024,
    description: "The permanent core: tees, trousers and shells built to repeat wear.",
    startsAt: "2024-03-01T00:00:00.000Z",
    isActive: true,
  },
  {
    name: "Weekend Form",
    season: "Summer",
    year: 2025,
    description: "Relaxed fits and washed finishes for days off.",
    startsAt: "2025-05-01T00:00:00.000Z",
    isActive: true,
  },
  {
    name: "Archive 2024",
    season: "Winter",
    year: 2024,
    description: "Last-season pieces kept online while stock lasts.",
    startsAt: "2024-01-01T00:00:00.000Z",
    isActive: false,
  },
];

export function seedCollections(): Collection[] {
  return SEEDS.map((seed, index) => ({
    id: `col-${index + 1}`,
    name: seed.name,
    slug: slugify(seed.name),
    season: seed.season,
    year: seed.year,
    description: seed.description,
    bannerUrl: `https://images.unsplash.com/photo-${
      ["1490481651871-ab68de25d43d", "1529139574466-a8c07d2c90a1", "1483985988355-763728e1935b"][index % 3]
    }?auto=format&fit=crop&w=1200&q=70`,
    startsAt: seed.startsAt,
    isActive: seed.isActive,
  }));
}
