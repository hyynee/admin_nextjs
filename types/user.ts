export type Role = "ADMIN" | "CUSTOMER";

export type Address = {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  line1: string;
  city: string;
  isDefault: boolean;
};

export type User = {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: Role;
  addresses: Address[];
};

export type UserInput = {
  email: string;
  fullName: string;
  phone: string;
  role: Role;
};
