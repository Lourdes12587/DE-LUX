"use client";

import { toast } from "sonner";
import type { AddResult, AvailabilityChange } from "@/store/cart";
import { formatPrice } from "@/lib/format";

/** Shows the right toast for an addToCart result. Returns true when something was actually added. */
export function notifyAdd(result: AddResult, label: string) {
  switch (result.status) {
    case "added":
      toast("Added to bag", {
        description: result.capped ? `${label} — only ${result.added} more available, you now have ${result.quantity}` : label,
      });
      return true;
    case "max_reached":
      toast("Already in your bag", { description: `${label} — you have all ${result.quantity} available` });
      return false;
    case "out_of_stock":
      toast("Sold out", { description: `${label} is no longer in stock` });
      return false;
    case "bag_full":
      toast("Your bag is full", { description: "Remove an item to add another one" });
      return false;
  }
}

/** Tells the shopper about changes the server made to their bag (stock dropped, price changed, item gone). */
export function notifyAvailability(changes: AvailabilityChange[]) {
  for (const c of changes) {
    const item = `${c.name} (${c.color}, ${c.size})`;
    if (c.kind === "removed") toast("Removed from your bag", { description: `${item} is no longer available` });
    else if (c.kind === "reduced") toast("Quantity updated", { description: `Only ${c.quantity} of ${item} available` });
    else toast("Price updated", { description: `${item} is now ${formatPrice(c.price!)}` });
  }
}
