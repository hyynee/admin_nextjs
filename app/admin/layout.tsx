import * as React from "react";
import { AdminShell } from "@/components/admin/layout";
import { LoadingState } from "@/components/ui";

export const metadata = {
  title: { default: "Northstar Admin", template: "%s · Northstar Admin" },
};

/**
 * Every list page reads its state from the URL via `useSearchParams`, which
 * Next.js requires to sit inside a Suspense boundary. Providing it once here
 * keeps each page free of boilerplate.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminShell>
      <React.Suspense fallback={<LoadingState label="Loading page" />}>{children}</React.Suspense>
    </AdminShell>
  );
}
