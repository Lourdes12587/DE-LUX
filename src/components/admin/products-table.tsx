"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { MoreHorizontal, Pencil, Copy, Archive, Trash2, ExternalLink, RotateCcw, Eye } from "lucide-react";
import { toast } from "sonner";
import type { AdminCategory, AdminProduct, ProductStatus } from "@/lib/admin-types";
import { api, ApiRequestError } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { FilterTabs, SearchField, StatusBadge, td, th } from "./ui";
import { productStatus } from "./status";

type Tab = "all" | ProductStatus;

const totalStock = (p: AdminProduct) => p.variants.reduce((s, v) => s + v.stock, 0);
const errorMessage = (e: unknown) => (e instanceof ApiRequestError ? e.message : "Something went wrong");

function RowMenu({
  product,
  onDuplicate,
  onStatus,
  onDelete,
}: {
  product: AdminProduct;
  onDuplicate: () => void;
  onStatus: (s: ProductStatus) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const archived = product.status === "archived";
  type Action = { label: string; icon: typeof Pencil; danger?: boolean; href?: string; run?: () => void };
  const actions: Action[] = [
    { label: "Edit", icon: Pencil, href: `/admin/products/${product.id}` },
    { label: "Preview", icon: Eye, href: `/admin/products/${product.id}/preview` },
    ...(product.status === "active" ? [{ label: "View in store", icon: ExternalLink, href: `/products/${product.slug}` }] : []),
    { label: "Duplicate", icon: Copy, run: onDuplicate },
    archived
      ? { label: "Restore as draft", icon: RotateCcw, run: () => onStatus("draft") }
      : { label: "Archive", icon: Archive, run: () => onStatus("archived") },
    { label: "Delete", icon: Trash2, danger: true, run: onDelete },
  ];
  return (
    <div className="relative" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${product.name}`}
        className="p-1.5 text-subtle hover:bg-paper hover:text-ink"
      >
        <MoreHorizontal className="size-4" />
      </button>
      {open && (
        <ul role="menu" className="absolute top-full right-0 z-20 mt-1 w-44 border border-stone bg-white py-1 shadow-[0_12px_32px_-16px_rgba(17,17,17,0.3)]">
          {actions.map((a) => {
            const cls = cn(
              "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12px] hover:bg-paper",
              a.danger && "text-critical",
            );
            return (
              <li key={a.label} role="none">
                {a.href ? (
                  <Link role="menuitem" href={a.href} className={cls}>
                    <a.icon className="size-3.5" strokeWidth={1.5} /> {a.label}
                  </Link>
                ) : (
                  <button
                    role="menuitem"
                    type="button"
                    className={cls}
                    onClick={() => {
                      setOpen(false);
                      a.run?.();
                    }}
                  >
                    <a.icon className="size-3.5" strokeWidth={1.5} /> {a.label}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function ProductsTable({ products, categories }: { products: AdminProduct[]; categories: AdminCategory[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<AdminProduct | null>(null);

  const counts = useMemo(() => {
    const c = { all: products.length, active: 0, draft: 0, archived: 0 };
    products.forEach((p) => c[p.status]++);
    return c;
  }, [products]);

  const rows = products.filter((p) => {
    if (tab !== "all" && p.status !== tab) return false;
    if (category !== "all" && p.category !== category) return false;
    const q = query.trim().toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
  });

  const allChecked = rows.length > 0 && rows.every((r) => selected.includes(r.id));
  const toggleAll = () => setSelected(allChecked ? [] : rows.map((r) => r.id));
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await action();
      toast(success);
      router.refresh();
      return true;
    } catch (e) {
      toast("Action failed", { description: errorMessage(e) });
      return false;
    } finally {
      setBusy(false);
    }
  }

  const setStatus = (ids: string[], status: ProductStatus) =>
    run(() => api("/api/admin/products/status", { method: "POST", body: { ids, status } }), `${ids.length} product${ids.length > 1 ? "s" : ""} set to ${status}`).then(
      (ok) => ok && setSelected([]),
    );

  const duplicate = async (p: AdminProduct) => {
    setBusy(true);
    try {
      const { product } = await api<{ product: AdminProduct }>(`/api/admin/products/${p.id}/duplicate`, { method: "POST" });
      toast("Product duplicated as draft", { description: product.name });
      router.push(`/admin/products/${product.id}`);
    } catch (e) {
      toast("Duplicate failed", { description: errorMessage(e) });
      setBusy(false);
    }
  };

  return (
    <div className={cn("border border-stone bg-white transition-opacity", busy && "pointer-events-none opacity-70")} aria-busy={busy}>
      <div className="px-5 sm:px-6">
        <FilterTabs<Tab>
          label="Product status"
          value={tab}
          onChange={setTab}
          options={[
            { value: "all", label: "All", count: counts.all },
            { value: "active", label: "Active", count: counts.active },
            { value: "draft", label: "Draft", count: counts.draft },
            { value: "archived", label: "Archived", count: counts.archived },
          ]}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 px-5 py-4 sm:px-6">
        <SearchField id="product-search" value={query} onChange={setQuery} placeholder="Search by name or SKU" />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger aria-label="Filter by category" className="h-10 w-[180px] rounded-none border-stone text-[13px] shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-none">
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.slug} value={c.slug}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selected.length > 0 && (
          <div className="ml-auto flex items-center gap-3 text-[12px]">
            <span className="text-subtle">{selected.length} selected</span>
            <button type="button" className="btn btn-outline h-9 px-4" onClick={() => setStatus(selected, "active")}>
              Activate
            </button>
            <button type="button" className="btn btn-outline h-9 px-4" onClick={() => setStatus(selected, "draft")}>
              Set draft
            </button>
            <button
              type="button"
              className="btn h-9 border border-critical/40 px-4 text-critical hover:bg-critical hover:text-white"
              onClick={() => setStatus(selected, "archived")}
            >
              Archive
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-[13px]">
          <thead>
            <tr className="border-y border-stone bg-paper/60">
              <th className={cn(th, "w-10")}>
                <Checkbox checked={allChecked} onCheckedChange={toggleAll} aria-label="Select all products" className="rounded-none" />
              </th>
              <th className={th}>Product</th>
              <th className={th}>Status</th>
              <th className={th}>Category</th>
              <th className={cn(th, "text-right")}>Price</th>
              <th className={th}>Inventory</th>
              <th className={cn(th, "text-right")}>Sold</th>
              <th className={cn(th, "w-12")}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone">
            {rows.map((p) => {
              const stock = totalStock(p);
              const soldOutSizes = p.sizes.filter((s) => (p.stock[s] ?? 0) === 0);
              return (
                <tr key={p.id} className={cn("hover:bg-paper/60", selected.includes(p.id) && "bg-paper/80")}>
                  <td className={td}>
                    <Checkbox checked={selected.includes(p.id)} onCheckedChange={() => toggle(p.id)} aria-label={`Select ${p.name}`} className="rounded-none" />
                  </td>
                  <td className={td}>
                    <div className="flex items-center gap-4">
                      <div className="relative aspect-[4/5] w-11 shrink-0 bg-paper">
                        {p.images[0] && <Image src={p.images[0].src} alt="" fill sizes="44px" className="object-cover" />}
                      </div>
                      <div className="min-w-0">
                        <Link href={`/admin/products/${p.id}`} className="font-medium hover:underline">
                          {p.name}
                        </Link>
                        <p className="mt-0.5 text-[11px] text-subtle">{p.sku || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className={td}>
                    <StatusBadge tone={productStatus[p.status].tone}>{productStatus[p.status].label}</StatusBadge>
                  </td>
                  <td className={cn(td, "text-subtle")}>{p.categoryName}</td>
                  <td className={cn(td, "text-right tabular-nums")}>
                    {formatPrice(p.price)}
                    {p.compareAtPrice && <p className="text-[11px] text-subtle line-through">{formatPrice(p.compareAtPrice)}</p>}
                  </td>
                  <td className={td}>
                    <p className={cn("tabular-nums", stock < 15 && "font-semibold text-critical")}>{stock} in stock</p>
                    <p className="mt-0.5 text-[11px] text-subtle">
                      {p.colors.length} {p.colors.length === 1 ? "colour" : "colours"}
                      {soldOutSizes.length > 0 && ` · ${soldOutSizes.join(", ")} sold out`}
                    </p>
                  </td>
                  <td className={cn(td, "text-right tabular-nums")}>{p.sold}</td>
                  <td className={td}>
                    <RowMenu
                      product={p}
                      onDuplicate={() => duplicate(p)}
                      onStatus={(s) => setStatus([p.id], s)}
                      onDelete={() => setDeleting(p)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p className="py-16 text-center text-[13px] text-subtle">No products match these filters.</p>}
      </div>

      <div className="flex items-center justify-between border-t border-stone px-5 py-3 text-[12px] text-subtle sm:px-6">
        <span>
          Showing {rows.length} of {products.length}
        </span>
      </div>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-md border-0 p-8">
          <DialogTitle className="display text-[28px]">Delete product?</DialogTitle>
          <DialogDescription className="text-[13px] text-subtle">
            <strong className="text-ink">{deleting?.name}</strong> and all its variants will be permanently deleted. Products with
            orders cannot be deleted — archive them instead.
          </DialogDescription>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setDeleting(null)} className="btn btn-outline h-10 px-2">
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                const p = deleting!;
                const ok = await run(() => api(`/api/admin/products/${p.id}`, { method: "DELETE" }), `${p.name} deleted`);
                if (ok) setDeleting(null);
              }}
              className="btn h-10 bg-critical px-2 text-white hover:bg-ink"
            >
              Delete
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
