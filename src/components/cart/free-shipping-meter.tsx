import { FREE_SHIPPING_THRESHOLD } from "@/lib/pricing";
import { formatPrice } from "@/lib/format";

export function FreeShippingMeter({ subtotal }: { subtotal: number }) {
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const pct = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);
  return (
    <div>
      <p className="text-[12px]">
        {remaining > 0 ? (
          <>
            You are <strong className="font-semibold">{formatPrice(remaining)}</strong> away from free shipping
          </>
        ) : (
          <>You&rsquo;ve unlocked complimentary shipping</>
        )}
      </p>
      <div
        className="mt-3 h-px bg-stone"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={FREE_SHIPPING_THRESHOLD}
        aria-valuenow={Math.round(subtotal)}
        aria-label="Progress to free shipping"
      >
        <div className="h-px bg-burgundy transition-[width] duration-700 ease-editorial" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
