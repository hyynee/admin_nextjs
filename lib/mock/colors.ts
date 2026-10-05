import type { Color } from "@/types";

const SEEDS = [
  { name: "Ink", hexCode: "#18212B" },
  { name: "Clay", hexCode: "#B86B4B" },
  { name: "Moss", hexCode: "#68705D" },
  { name: "Bone", hexCode: "#E4DED2" },
  { name: "Clay Red", hexCode: "#A64B3C" },
  { name: "Navy", hexCode: "#2C3E55" },
] as const;

export function seedColors(): Color[] {
  return SEEDS.map((seed, index) => ({
    id: `color-${index + 1}`,
    name: seed.name,
    hexCode: seed.hexCode,
  }));
}
