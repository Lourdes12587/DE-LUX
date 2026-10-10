"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useFieldArray, useForm, type FieldError } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowLeft, ArrowUp, Copy, Eye, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { AdminCategory, AdminProduct } from "@/lib/admin-types";
import { api, ApiRequestError } from "@/lib/api";
import { applyServerErrors } from "@/lib/form-errors";
import { IMAGE_HOSTS, isAllowedImageUrl, productInputSchema, type ProductFormValues, type ProductInput } from "@/lib/schemas/product";
import { SIZES, type Size } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ImageDropzone } from "./image-dropzone";
import { Panel, StatusBadge } from "./ui";
import { productStatus } from "./status";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const box =
  "h-10 w-full border border-stone bg-white px-3 text-[13px] outline-none transition-colors placeholder:text-subtle/60 focus:border-ink focus-visible:outline-none aria-[invalid=true]:border-critical";

function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: { message?: string } | FieldError;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="eyebrow text-subtle">
        {label}
      </label>
      <div className="mt-2">{children}</div>
      {error?.message ? (
        <p id={`${htmlFor}-error`} className="mt-1.5 text-[11px] text-critical">
          {error.message}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-[11px] text-subtle">{hint}</p>
      )}
    </div>
  );
}

function toFormValues(product: AdminProduct | undefined): ProductFormValues {
  const stock: ProductFormValues["stock"] = {};
  for (const v of product?.variants ?? []) (stock[v.color] ??= {})[v.size] = v.stock;
  return {
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    description: product?.description ?? "",
    composition: product?.composition ?? "",
    details: product?.details ?? [],
    price: product?.price ?? (undefined as unknown as number),
    compareAtPrice: product?.compareAtPrice ?? null,
    status: product?.status ?? "draft",
    // No default category: an unnoticed default put new products in the wrong collection.
    categoryId: product?.categoryId ?? "",
    featured: !!product?.featured,
    newArrival: product ? !!product.newArrival : true,
    bestSeller: !!product?.bestSeller,
    seoTitle: product?.seoTitle ?? "",
    seoDescription: product?.seoDescription ?? "",
    colors: product?.colors ?? [{ name: "Black", hex: "#111111" }],
    stock,
    images: product?.images.map((i) => ({ url: i.src, alt: i.alt })) ?? [],
  };
}

export function ProductForm({ product, categories }: { product?: AdminProduct; categories: AdminCategory[] }) {
  const router = useRouter();
  const isNew = !product;
  const [slugTouched, setSlugTouched] = useState(!!product);
  const [newImage, setNewImage] = useState("");
  const [imageError, setImageError] = useState<string | null>(null);
  const [newColor, setNewColor] = useState({ name: "", hex: "#7a1018" });
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues, unknown, ProductInput>({
    resolver: zodResolver(productInputSchema),
    defaultValues: toFormValues(product),
  });
  const colors = useFieldArray({ control, name: "colors" });
  const images = useFieldArray({ control, name: "images" });

  const [name, slug, description, seoTitle, seoDescription, price, compareAt, stock, colorValues] = watch([
    "name",
    "slug",
    "description",
    "seoTitle",
    "seoDescription",
    "price",
    "compareAtPrice",
    "stock",
    "colors",
  ]);
  const totalUnits = colorValues.reduce((s, c) => s + SIZES.reduce((n, size) => n + (stock[c.name]?.[size] ?? 0), 0), 0);
  const skuOf = (color: string, size: Size) => product?.variants.find((v) => v.color === color && v.size === size)?.sku;

  const addImage = () => {
    const url = newImage.trim();
    if (!isAllowedImageUrl(url)) {
      setImageError(`Enter an https image URL hosted on ${IMAGE_HOSTS.join(", ")}, or upload the file.`);
      return;
    }
    images.append({ url, alt: "" });
    setNewImage("");
    setImageError(null);
  };

  const addColor = () => {
    const n = newColor.name.trim();
    if (!n || getValues("colors").some((c) => c.name.toLowerCase() === n.toLowerCase())) return;
    colors.append({ name: n, hex: newColor.hex });
    setNewColor({ name: "", hex: "#7a1018" });
  };

  const removeColor = (index: number) => {
    const removed = getValues(`colors.${index}.name`);
    colors.remove(index);
    const { [removed]: _drop, ...rest } = getValues("stock");
    void _drop;
    setValue("stock", rest);
  };

  const onSubmit = async (values: ProductInput) => {
    setFormError(null);
    // Send a complete colour × size matrix so missing cells become explicit zeros.
    const body: ProductInput = {
      ...values,
      composition: values.composition || undefined,
      seoTitle: values.seoTitle || undefined,
      seoDescription: values.seoDescription || undefined,
      stock: Object.fromEntries(values.colors.map((c) => [c.name, Object.fromEntries(SIZES.map((s) => [s, values.stock[c.name]?.[s] ?? 0]))])),
    };
    try {
      const { product: saved } = await api<{ product: AdminProduct }>(isNew ? "/api/admin/products" : `/api/admin/products/${product.id}`, {
        method: isNew ? "POST" : "PUT",
        body,
      });
      toast(isNew ? "Product created" : "Changes saved", {
        description: saved.status === "active" ? `${saved.name} is live in the store` : `${saved.name} is a ${saved.status} — not visible in the store`,
      });
      // Navigating loads fresh data; refresh() is only needed when staying on the page (and would race a push).
      if (isNew) router.push(`/admin/products/${saved.id}`);
      else router.refresh();
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 409) {
        setError("slug", { type: "server", message: "This URL handle is already used by another product" });
        setFormError("Please review the highlighted fields.");
      } else setFormError(applyServerErrors(err, setError, "Could not save the product. Please try again."));
    }
  };

  const duplicate = async () => {
    try {
      const { product: copy } = await api<{ product: AdminProduct }>(`/api/admin/products/${product!.id}/duplicate`, { method: "POST" });
      toast("Duplicated as draft", { description: copy.name });
      router.push(`/admin/products/${copy.id}`);
    } catch (err) {
      toast("Duplicate failed", { description: err instanceof ApiRequestError ? err.message : undefined });
    }
  };

  const remove = async () => {
    try {
      await api(`/api/admin/products/${product!.id}`, { method: "DELETE" });
      toast("Product deleted", { description: product!.name });
      router.push("/admin/products");
    } catch (err) {
      setConfirmDelete(false);
      toast("Delete failed", { description: err instanceof ApiRequestError ? err.message : undefined });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, () => setFormError("Please review the highlighted fields."))} className="space-y-8" noValidate>
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <Link href="/admin/products" className="nav-label inline-flex items-center gap-2 text-subtle hover:text-ink">
            <ArrowLeft className="size-3.5" /> Products
          </Link>
          <h1 className="display mt-4 text-[40px] sm:text-[48px]">{isNew ? "New product" : name || "Untitled"}</h1>
          {!isNew && (
            <div className="mt-3 flex items-center gap-3 text-[12px] text-subtle">
              <StatusBadge tone={productStatus[product.status].tone}>{productStatus[product.status].label}</StatusBadge>
              <span>{product.sku}</span>
              <span>· {product.sold} sold</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          {!isNew && (
            <Link href={`/admin/products/${product.id}/preview`} className="btn btn-outline h-10 px-5">
              <Eye className="size-3.5" /> Preview
            </Link>
          )}
          <Link href="/admin/products" className="btn btn-outline h-10 px-5">
            Discard
          </Link>
          <button type="submit" disabled={isSubmitting} className="btn btn-primary h-10 px-6">
            {isSubmitting ? "Saving…" : isNew ? "Create product" : "Save changes"}
          </button>
        </div>
      </div>

      {formError && (
        <p role="alert" className="border border-critical/30 bg-critical/[0.05] px-4 py-3 text-[13px] text-critical">
          {formError}
        </p>
      )}

      {!isNew && product.status !== "active" && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-4 border border-warning/30 bg-warning/[0.06] px-4 py-3 text-[13px]">
          <p>
            <strong className="font-semibold">This product is {product.status === "draft" ? "a draft" : "archived"}</strong> and is not visible in
            the store.
            {product.images.length === 0 && " Add at least one image before publishing."}
          </p>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              setValue("status", "active");
              void handleSubmit(onSubmit, () => setFormError("Please review the highlighted fields."))();
            }}
            className="btn btn-primary h-9 px-5"
          >
            Save &amp; publish
          </button>
        </div>
      )}

      {isNew && (
        <p className="text-[12px] text-subtle">
          New products are saved as <strong className="text-ink">Draft</strong> unless you set the status to Active. Drafts are hidden from the store
          but can be previewed.
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title="General">
            <div className="space-y-6">
              <Field label="Name" htmlFor="p-name" error={errors.name}>
                <input
                  id="p-name"
                  placeholder="e.g. Classic Belted Trench"
                  aria-invalid={!!errors.name}
                  className={box}
                  {...register("name", {
                    onChange: (e) => !slugTouched && setValue("slug", slugify(e.target.value)),
                  })}
                />
              </Field>
              <Field label="URL handle" htmlFor="p-slug" hint={`delux-studio.com/products/${slug || "…"}`} error={errors.slug}>
                <input
                  id="p-slug"
                  aria-invalid={!!errors.slug}
                  className={box}
                  {...register("slug", {
                    onChange: (e) => {
                      setSlugTouched(true);
                      setValue("slug", slugify(e.target.value));
                    },
                  })}
                />
              </Field>
              <Field label="Description" htmlFor="p-desc" error={errors.description}>
                <textarea
                  id="p-desc"
                  rows={5}
                  placeholder="Tell the story of the piece: cut, fabric, how to wear it."
                  className={cn(box, "h-auto resize-y py-2.5 leading-relaxed")}
                  {...register("description")}
                />
              </Field>
              <div className="grid gap-6 sm:grid-cols-2">
                <Field label="Composition" htmlFor="p-comp" error={errors.composition}>
                  <input id="p-comp" placeholder="80% wool, 20% polyamide" className={box} {...register("composition")} />
                </Field>
                <Controller
                  control={control}
                  name="details"
                  render={({ field }) => (
                    <DetailsInput value={field.value ?? []} onChange={field.onChange} error={errors.details as FieldError | undefined} />
                  )}
                />
              </div>
            </div>
          </Panel>

          <Panel title="Media" action={<span className="text-[11px] text-subtle">4:5 · first image is the cover</span>}>
            {images.fields.length > 0 && (
              <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {images.fields.map((img, i) => (
                  <li key={img.id} className="group relative aspect-[4/5] bg-paper">
                    {/* Plain <img>: admin previews must not depend on next/image host config. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={img.alt ?? ""} className="absolute inset-0 size-full object-cover" />
                    {i === 0 && <span className="eyebrow absolute bottom-2 left-2 bg-white px-1.5 py-0.5">Cover</span>}
                    <div className="absolute top-1.5 right-1.5 flex flex-col gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                      <button type="button" aria-label={`Remove image ${i + 1}`} onClick={() => images.remove(i)} className="bg-white/90 p-1">
                        <X className="size-3.5" />
                      </button>
                      {i > 0 && (
                        <button type="button" aria-label={`Move image ${i + 1} earlier`} onClick={() => images.move(i, i - 1)} className="bg-white/90 p-1">
                          <ArrowUp className="size-3.5" />
                        </button>
                      )}
                      {i < images.fields.length - 1 && (
                        <button type="button" aria-label={`Move image ${i + 1} later`} onClick={() => images.move(i, i + 1)} className="bg-white/90 p-1">
                          <ArrowDown className="size-3.5" />
                        </button>
                      )}
                    </div>
                    {errors.images?.[i]?.url && <p className="absolute inset-x-0 bottom-0 bg-critical px-1 text-[10px] text-white">{errors.images[i]?.url?.message}</p>}
                  </li>
                ))}
              </ul>
            )}
            <div className={cn(images.fields.length > 0 && "mt-5")}>
              <ImageDropzone compact={images.fields.length > 0} onUploaded={(url) => images.append({ url, alt: "" })} />
            </div>
            <p className="mt-5 text-[11px] text-subtle">Or add an image by URL ({IMAGE_HOSTS.join(", ")}):</p>
            <div className="mt-2 flex flex-wrap items-start gap-2">
              <div className="min-w-0 flex-1">
                <label htmlFor="p-image-url" className="sr-only">
                  Image URL
                </label>
                <input
                  id="p-image-url"
                  value={newImage}
                  onChange={(e) => setNewImage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addImage();
                    }
                  }}
                  placeholder="https://images.unsplash.com/photo-…"
                  aria-invalid={!!imageError}
                  className={box}
                />
                {imageError && <p className="mt-1.5 text-[11px] text-critical">{imageError}</p>}
              </div>
              <button
                type="button"
                onClick={addImage}
                disabled={!newImage.trim()}
                className="flex h-10 items-center gap-1.5 border border-ink px-4 text-[11px] uppercase tracking-[0.12em] hover:bg-ink hover:text-white disabled:opacity-40"
              >
                <ImagePlus className="size-3.5" /> Add image
              </button>
            </div>
            {errors.images?.message && <p className="mt-2 text-[11px] text-critical">{errors.images.message}</p>}
          </Panel>

          <Panel title="Variants & inventory" action={<span className="text-[12px] text-subtle tabular-nums">{totalUnits} units total</span>}>
            <div>
              <p className="eyebrow text-subtle">Colours</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {colors.fields.map((c, i) => (
                  <li key={c.id} className="flex items-center gap-2 border border-stone py-1.5 pr-1.5 pl-2.5 text-[12px]">
                    <span className="size-3.5 rounded-full ring-1 ring-black/15" style={{ background: c.hex }} />
                    {c.name}
                    <button
                      type="button"
                      disabled={colors.fields.length === 1}
                      onClick={() => removeColor(i)}
                      aria-label={`Remove ${c.name}`}
                      className="p-0.5 text-subtle hover:text-ink disabled:opacity-30"
                    >
                      <X className="size-3" />
                    </button>
                  </li>
                ))}
                <li className="flex items-center gap-2">
                  <input
                    type="color"
                    aria-label="New colour swatch"
                    value={newColor.hex}
                    onChange={(e) => setNewColor((n) => ({ ...n, hex: e.target.value }))}
                    className="size-8 cursor-pointer border border-stone bg-white p-0.5"
                  />
                  <input
                    aria-label="New colour name"
                    value={newColor.name}
                    onChange={(e) => setNewColor((n) => ({ ...n, name: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addColor();
                      }
                    }}
                    placeholder="Colour name"
                    className={cn(box, "h-8 w-32")}
                  />
                  <button
                    type="button"
                    onClick={addColor}
                    className="flex h-8 items-center gap-1 border border-ink px-2.5 text-[11px] uppercase tracking-[0.12em] hover:bg-ink hover:text-white"
                  >
                    <Plus className="size-3" /> Add
                  </button>
                </li>
              </ul>
              {(errors.colors?.message || errors.colors?.root?.message) && (
                <p className="mt-2 text-[11px] text-critical">{errors.colors?.message ?? errors.colors?.root?.message}</p>
              )}
              {!isNew && <p className="mt-2 text-[11px] text-subtle">Removing a colour deletes its variants. Past orders keep their own copy.</p>}
            </div>

            <div className="mt-8 overflow-x-auto">
              <table className="w-full min-w-[520px] text-[13px]">
                <caption className="sr-only">Stock per colour and size</caption>
                <thead>
                  <tr className="border-b border-stone">
                    <th scope="col" className="eyebrow py-2 text-left font-semibold text-subtle">
                      Colour
                    </th>
                    {SIZES.map((s) => (
                      <th key={s} scope="col" className="eyebrow py-2 text-center font-semibold text-subtle">
                        {s}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone">
                  {colorValues.map((c) => (
                    <tr key={c.name}>
                      <th scope="row" className="py-2.5 pr-3 text-left font-medium">
                        <span className="flex items-center gap-2">
                          <span className="size-3 rounded-full ring-1 ring-black/15" style={{ background: c.hex }} />
                          {c.name}
                        </span>
                      </th>
                      {SIZES.map((s) => {
                        const value = stock[c.name]?.[s] ?? 0;
                        return (
                          <td key={s} className="px-1 py-2.5 text-center">
                            <input
                              type="number"
                              min={0}
                              aria-label={`Stock for ${c.name}, size ${s}`}
                              title={skuOf(c.name, s) ?? "SKU assigned on save"}
                              value={value}
                              onChange={(e) =>
                                setValue(
                                  "stock",
                                  { ...stock, [c.name]: { ...stock[c.name], [s]: Math.max(0, Math.floor(Number(e.target.value) || 0)) } },
                                  { shouldDirty: true },
                                )
                              }
                              className={cn(box, "h-9 w-[72px] text-center tabular-nums", value === 0 && "border-critical/40 text-critical")}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {errors.stock && <p className="mt-3 text-[11px] text-critical">Check the stock values: whole numbers of 0 or more.</p>}
            {!isNew && <p className="mt-3 text-[11px] text-subtle">Every stock change is recorded in the inventory history.</p>}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Status">
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-label="Product status" className="h-10 w-full rounded-none border-stone text-[13px] shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-none">
                    <SelectItem value="active">Active — visible in store</SelectItem>
                    <SelectItem value="draft">Draft — hidden</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </Panel>

          <Panel title="Pricing">
            <div className="space-y-5">
              <Field label="Price (€)" htmlFor="p-price" error={errors.price}>
                <input
                  id="p-price"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  aria-invalid={!!errors.price}
                  className={cn(box, "tabular-nums")}
                  {...register("price", { valueAsNumber: true })}
                />
              </Field>
              <Field label="Compare-at price (€)" htmlFor="p-compare" hint="Set to show the product as on sale" error={errors.compareAtPrice}>
                <input
                  id="p-compare"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Optional"
                  aria-invalid={!!errors.compareAtPrice}
                  className={cn(box, "tabular-nums")}
                  {...register("compareAtPrice", { setValueAs: (v) => (v === "" || v == null ? null : Number(v)) })}
                />
              </Field>
              {Number(compareAt) > Number(price) && Number(price) > 0 && (
                <p className="text-[12px] text-burgundy">−{Math.round((1 - Number(price) / Number(compareAt)) * 100)}% — will appear in Sale</p>
              )}
            </div>
          </Panel>

          <Panel title="Organisation">
            <div className="space-y-5">
              <Field label="Category" htmlFor="p-cat" error={errors.categoryId}>
                <Controller
                  control={control}
                  name="categoryId"
                  render={({ field }) => (
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="p-cat"
                        aria-invalid={!!errors.categoryId}
                        className="h-10 w-full rounded-none border-stone text-[13px] shadow-none aria-[invalid=true]:border-critical"
                      >
                        <SelectValue placeholder="Choose a category" />
                      </SelectTrigger>
                      <SelectContent className="rounded-none">
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <fieldset className="space-y-3">
                <legend className="eyebrow mb-3 text-subtle">Merchandising</legend>
                {(
                  [
                    ["newArrival", "Show in New In"],
                    ["featured", "Featured on homepage"],
                    ["bestSeller", "Best seller badge"],
                  ] as const
                ).map(([k, l]) => (
                  <Controller
                    key={k}
                    control={control}
                    name={k}
                    render={({ field }) => (
                      <div className="flex items-center gap-3">
                        <Checkbox id={`f-${k}`} checked={!!field.value} onCheckedChange={(v) => field.onChange(v === true)} className="rounded-none" />
                        <label htmlFor={`f-${k}`} className="text-[13px]">
                          {l}
                        </label>
                      </div>
                    )}
                  />
                ))}
              </fieldset>
            </div>
          </Panel>

          <Panel title="Search engine listing">
            <div className="space-y-4">
              <Field label="SEO title" htmlFor="p-seo-title" hint="Defaults to the product name" error={errors.seoTitle}>
                <input id="p-seo-title" placeholder={name} className={box} {...register("seoTitle")} />
              </Field>
              <Field label="SEO description" htmlFor="p-seo-desc" hint="Defaults to the description" error={errors.seoDescription}>
                <textarea id="p-seo-desc" rows={3} className={cn(box, "h-auto resize-y py-2")} {...register("seoDescription")} />
              </Field>
              <div className="border-t border-stone pt-4">
                <p className="truncate text-[12px] text-good">delux-studio.com › products › {slug || "…"}</p>
                <p className="mt-1 text-[16px] text-[#1a0dab]">{seoTitle || name || "Product name"} — DE LUX</p>
                <p className="mt-1 line-clamp-2 text-[12px] text-subtle">{seoDescription || description || "The product description will appear here."}</p>
              </div>
            </div>
          </Panel>

          {!isNew && (
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={duplicate} className="btn btn-outline h-10 px-2">
                <Copy className="size-3.5" /> Duplicate
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="btn h-10 border border-critical/40 px-2 text-critical hover:bg-critical hover:text-white"
              >
                <Trash2 className="size-3.5" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {!isNew && (
        <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <DialogContent className="max-w-md border-0 p-8">
            <DialogTitle className="display text-[28px]">Delete product?</DialogTitle>
            <DialogDescription className="text-[13px] text-subtle">
              <strong className="text-ink">{product.name}</strong> and all its variants will be permanently deleted. Products with orders
              cannot be deleted — archive them instead.
            </DialogDescription>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setConfirmDelete(false)} className="btn btn-outline h-10 px-2">
                Cancel
              </button>
              <button type="button" onClick={remove} className="btn h-10 bg-critical px-2 text-white hover:bg-ink">
                Delete
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </form>
  );
}

/** Comma-separated text input bound to a string[] form value. */
function DetailsInput({ value, onChange, error }: { value: string[]; onChange: (v: string[]) => void; error?: FieldError }) {
  const [text, setText] = useState(value.join(", "));
  return (
    <Field label="Details" htmlFor="p-details" hint="Separate with commas" error={error}>
      <input
        id="p-details"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(
            e.target.value
              .split(",")
              .map((d) => d.trim())
              .filter(Boolean),
          );
        }}
        placeholder="Relaxed fit, Funnel collar"
        className={box}
      />
    </Field>
  );
}
