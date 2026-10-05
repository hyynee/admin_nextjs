import type { User } from "@/types";

type Seed = {
  fullName: string;
  role: User["role"];
  city: string;
  addresses: Array<{ label: string; line1: string }>;
};

const SEEDS: readonly Seed[] = [
  {
    fullName: "Maya Chen",
    role: "ADMIN",
    city: "San Francisco, CA",
    addresses: [{ label: "Studio", line1: "210 Mission Street" }],
  },
  {
    fullName: "Jon Bell",
    role: "CUSTOMER",
    city: "Brooklyn, NY",
    addresses: [
      { label: "Home", line1: "48 Bergen Street" },
      { label: "Office", line1: "85 Broad Street" },
    ],
  },
  {
    fullName: "Rina Patel",
    role: "CUSTOMER",
    city: "Chicago, IL",
    addresses: [{ label: "Home", line1: "1732 W Division Street" }],
  },
  {
    fullName: "Theo Grant",
    role: "CUSTOMER",
    city: "Austin, TX",
    addresses: [{ label: "Home", line1: "901 E 6th Street" }],
  },
  {
    fullName: "Sofia Reed",
    role: "CUSTOMER",
    city: "Portland, OR",
    addresses: [{ label: "Home", line1: "722 NW 13th Avenue" }],
  },
  {
    fullName: "Noah Kim",
    role: "CUSTOMER",
    city: "Seattle, WA",
    addresses: [{ label: "Home", line1: "3411 Fremont Avenue" }],
  },
];

export function seedUsers(): User[] {
  return SEEDS.map((seed, index) => {
    const email = `${seed.fullName.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "")}@northstar.co`;
    const phone = `+1 415 555 0${String(100 + index)}`;
    return {
      id: `user-${index + 1}`,
      email,
      fullName: seed.fullName,
      phone,
      role: seed.role,
      addresses: seed.addresses.map((address, addressIndex) => ({
        id: `address-${index + 1}-${addressIndex + 1}`,
        label: address.label,
        recipientName: seed.fullName,
        phone,
        line1: address.line1,
        city: seed.city,
        isDefault: addressIndex === 0,
      })),
    };
  });
}
