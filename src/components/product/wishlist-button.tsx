"use client";

import { Heart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useWishlist } from "@/store/wishlist";
import { useHydrated } from "@/store/ui";

export function WishlistButton({
  productId,
  name,
  className,
  withLabel,
}: {
  productId: string;
  name: string;
  className?: string;
  withLabel?: boolean;
}) {
  const hydrated = useHydrated();
  const saved = useWishlist((s) => s.ids.includes(productId)) && hydrated;
  const toggle = useWishlist((s) => s.toggle);

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from wishlist` : `Add ${name} to wishlist`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(productId);
        toast(saved ? "Removed from wishlist" : "Saved to wishlist");
      }}
      className={cn("group/wish flex items-center gap-2", className)}
    >
      <Heart
        strokeWidth={1.25}
        className={cn(
          "size-[18px] transition-all duration-300 group-active/wish:scale-75",
          saved ? "fill-burgundy text-burgundy" : "group-hover/wish:text-burgundy",
        )}
      />
      {withLabel && <span className="nav-label">{saved ? "Saved" : "Wishlist"}</span>}
    </button>
  );
}
