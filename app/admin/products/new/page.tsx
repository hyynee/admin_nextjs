"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Card, CardBody } from "@/components/ui";
import { PageHeader } from "@/components/admin/layout";
import { ProductForm } from "@/components/admin/forms/product-form";
import { useCreateMutation } from "@/hooks/use-admin-mutation";
import { productService } from "@/lib/services";
import type { Product, ProductInput, ProductOptions } from "@/types";

export default function NewProductPage() {
  const router = useRouter();

  const { data: options } = useQuery({
    queryKey: ["products", "options"],
    queryFn: productService.options,
  });

  const createProduct = useCreateMutation<ProductInput, Product>({
    queryKey: "products",
    entityLabel: "Product",
    successMessage: (product) => `${product.name} created`,
    mutationFn: productService.create,
    onSuccess: (product) => {
      router.push(`/admin/products/${product.id}`);
    },
  });

  // The header renders on the first paint and the form is replaced in place, so
  // the page never reflows from a bare skeleton into a full layout.
  return (
    <>
      <PageHeader
        eyebrow="Products"
        title="New product"
        back={{ label: "All products", href: "/admin/products" }}
        description="Price lives on the product. Variants carry size, colour, SKU and stock only."
      />

      {options ? (
        <ProductForm
          product={null}
          options={options as ProductOptions}
          onSubmit={async (input) => {
            await createProduct.mutateAsync(input);
          }}
          onCancel={() => router.push("/admin/products")}
        />
      ) : (
        <Card>
          <CardBody>
            {/* Same shape as the form card so nothing jumps when it arrives. */}
            <div className="h-[520px] animate-pulse rounded bg-canvas-line" />
          </CardBody>
        </Card>
      )}
    </>
  );
}