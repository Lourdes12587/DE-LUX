import type { Category } from "@/lib/types";

const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=80`;

/** Collections computed from product data rather than stored as Category rows. */
export const VIRTUAL_COLLECTIONS: Category[] = [
  {
    slug: "new-in",
    name: "New In",
    title: "The New Edition",
    description: "Freshly arrived pieces from the Autumn / Winter 2026 collection.",
    image: unsplash("1483985988355-763728e1935b"),
    virtual: "new",
  },
  {
    slug: "sale",
    name: "Sale",
    title: "Sale",
    description: "Selected pieces at a new price, while sizes last.",
    image: unsplash("1548624313-0396c75e4b1a"),
    virtual: "sale",
  },
];
