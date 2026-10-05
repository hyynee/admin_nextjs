"use client";

import { useQuery } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";
import {
  ActiveBadge,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DescriptionList,
  Table,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { PageHeader } from "@/components/admin/layout";
import { ColorSwatch, ProductThumb } from "@/components/admin/primitives";
import { productService } from "@/lib/services";
import { formatCurrency, formatDate, formatNumber, totalStock } from "@/lib/utils";
import type { Product } from "@/types";

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const productId = params.id;

  const { data: product, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["products", "detail", productId],
    queryFn: () => productService.get(productId),
  });

  const { data: options } = useQuery({
    queryKey: ["products", "options"],
    queryFn: productService.options,
  });

  if (isLoading) {
    return (
      <Card>
        <CardBody>
          <div className="h-96 animate-pulse rounded bg-canvas-line" />
        </CardBody>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-coral">
            {error instanceof Error ? error.message : "Could not load this product."}
          </p>
          <Button className="mt-3" size="sm" onClick={() => void refetch()}>
            Try again
          </Button>
        </CardBody>
      </Card>
    );
  }

  if (!product || !options) return <ProductNotFound />;

  const category = options.categories.find((row) => row.id === product.categoryId);
  const collection = options.collections.find((row) => row.id === product.collectionId);
  const stock = totalStock(product.variants);

  return (
    <>
      <PageHeader
        eyebrow="Products"
        title={product.name}
        back={{ label: "All products", href: "/admin/products" }}
        description={product.description || "No description yet."}
        actions={
          <div className="flex items-center gap-2">
            <ActiveBadge isActive={product.isActive} />
            <Button asChild size="sm">
              <Link href={`/admin/products/${product.id}/edit`}>
                <Pencil className="size-3.5" />
                Edit
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Key facts */}
        <Card className="lg:col-span-2">
          <CardHeader title="Information" />
          <CardBody>
            <DescriptionList
              items={[
                { label: "SKU base", value: <span className="font-mono text-xs">{product.slug}</span> },
                {
                  label: "Price",
                  value: (
                    <span className="flex items-baseline gap-2">
                      <span className="font-display text-lg font-bold text-ink">
                        {formatCurrency(product.salePrice ?? product.price)}
                      </span>
                      {product.salePrice !== null ? (
                        <span className="text-sm text-muted line-through">
                          {formatCurrency(product.price)}
                        </span>
                      ) : null}
                    </span>
                  ),
                },
                {
                  label: "Sale window",
                  value:
                    product.saleStartsAt && product.saleEndsAt ? (
                      <span className="text-sm">
                        {formatDate(product.saleStartsAt)} → {formatDate(product.saleEndsAt)}
                      </span>
                    ) : (
                      <span className="font-normal text-muted">Not on sale</span>
                    ),
                },
                {
                  label: "Category",
                  value: category ? (
                    <Link
                      href={`/admin/categories?search=${encodeURIComponent(category.name)}`}
                      className="inline-block py-1 text-coral hover:underline"
                    >
                      {category.name}
                    </Link>
                  ) : (
                    "—"
                  ),
                },
                {
                  label: "Collection",
                  value: collection ? (
                    <Link
                      href={`/admin/collections?search=${encodeURIComponent(collection.name)}`}
                      className="inline-block py-1 text-coral hover:underline"
                    >
                      {collection.name}
                    </Link>
                  ) : (
                    "—"
                  ),
                },
                {
                  label: "Stock",
                  value: (
                    <span className="flex items-center gap-2">
                      <span className="font-display text-lg font-bold text-ink">
                        {formatNumber(stock)}
                      </span>
                      <span className="text-xs text-muted">
                        across {product.variants.length} variants
                      </span>
                    </span>
                  ),
                },
                { label: "Created", value: formatDate(product.createdAt) },
              ]}
            />
          </CardBody>
        </Card>

        {/* Cover image */}
        <Card>
          <CardHeader title="Cover" />
          <CardBody>
            {product.images.length === 0 ? (
              <p className="text-sm text-muted">No images yet.</p>
            ) : (
              <ProductThumb
                src={product.images[0].url}
                alt={product.images[0].altText || product.name}
                size="md"
              />
            )}
            <p className="mt-3 text-xs text-muted">
              {product.images.length} image{product.images.length === 1 ? "" : "s"} ·{" "}
              {product.images.filter((image) => image.colorId === null).length} shared
            </p>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-4">
        <CardBody className="p-0">
          <Tabs defaultValue="variants">
            <div className="border-b border-line px-4">
              <TabsList>
                <TabsTrigger value="variants">
                  Variants ({product.variants.length})
                </TabsTrigger>
                <TabsTrigger value="images">
                  Images ({product.images.length})
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Variants: no price column by design */}
            <TabsContent value="variants">
              <TableWrap>
                <Table className="min-w-2xl">
                  <THead>
                    <tr>
                      <TH scope="col">SKU</TH>
                      <TH scope="col">Size</TH>
                      <TH scope="col">Color</TH>
                      <TH scope="col" className="text-right">
                        Stock
                      </TH>
                    </tr>
                  </THead>
                  <TBody>
                    {product.variants.map((variant) => {
                      const size = options.sizes.find((row) => row.id === variant.sizeId);
                      const color = options.colors.find((row) => row.id === variant.colorId);
                      return (
                        <TR key={variant.id}>
                          <TD>
                            <span className="font-mono text-xs font-semibold text-ink">
                              {variant.sku}
                            </span>
                          </TD>
                          <TD>
                            <span className="text-sm">{size?.label ?? "—"}</span>
                          </TD>
                          <TD>
                            {color ? (
                              <ColorSwatch hexCode={color.hexCode} name={color.name} size="sm" />
                            ) : (
                              "—"
                            )}
                          </TD>
                          <TD className="text-right">
                            <Badge tone={variant.stockQuantity === 0 ? "danger" : "neutral"}>
                              {formatNumber(variant.stockQuantity)}
                            </Badge>
                          </TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
              </TableWrap>
            </TabsContent>

            {/* Images grouped by colour */}
            <TabsContent value="images">
              <ImageGallery product={product} colors={options.colors} />
            </TabsContent>
          </Tabs>
        </CardBody>
      </Card>
    </>
  );
}

function ProductNotFound() {
  return (
    <Card>
      <CardBody className="py-16 text-center">
        <p className="text-sm font-semibold text-ink">Product not found</p>
        <p className="mt-1 text-xs text-muted">
          It may have been deleted, or the link is out of date.
        </p>
        <Button asChild variant="secondary" size="sm" className="mt-4">
          <Link href="/admin/products">Back to products</Link>
        </Button>
      </CardBody>
    </Card>
  );
}

function ImageGallery({
  product,
  colors,
}: {
  product: Product;
  colors: Array<{ id: string; name: string; hexCode: string }>;
}) {
  const shared = product.images.filter((image) => image.colorId === null);
  const grouped = colors
    .map((color) => ({
      color,
      images: product.images.filter((image) => image.colorId === color.id),
    }))
    .filter((group) => group.images.length > 0);

  return (
    <div className="space-y-6 p-4">
      {shared.length > 0 ? (
        <section>
          <h3 className="text-[10px] font-bold tracking-wider text-muted uppercase">
            Shared across all colors
          </h3>
          <div className="mt-3 flex flex-wrap gap-3">
            {shared.map((image) => (
              <Figure key={image.id} url={image.url} alt={image.altText} name={product.name} />
            ))}
          </div>
        </section>
      ) : null}

      {grouped.length === 0 && shared.length === 0 ? (
        <p className="text-sm text-muted">No images yet.</p>
      ) : null}

      {grouped.map(({ color, images }) => (
        <section key={color.id}>
          <h3 className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-muted uppercase">
            <ColorSwatch hexCode={color.hexCode} size="sm" />
            {color.name}
          </h3>
          <div className="mt-3 flex flex-wrap gap-3">
            {images.map((image) => (
              <Figure key={image.id} url={image.url} alt={image.altText} name={product.name} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Figure({ url, alt, name }: { url: string; alt: string; name: string }) {
  return (
    <figure className="w-32">
      <div className="overflow-hidden rounded-md border border-line bg-canvas-line">
        {/* Remote placeholder images: plain <img> avoids next/image remote config. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={alt || name} loading="lazy" className="aspect-square w-full object-cover" />
      </div>
      <figcaption className="mt-1.5 truncate text-[11px] text-muted">{alt || "—"}</figcaption>
    </figure>
  );
}