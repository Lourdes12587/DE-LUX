"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Single-series horizontal bars (magnitude → one hue). Values are labelled in text ink, not series colour. */
export function CategoryBars({ data }: { data: { category: string; value: number }[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(...data.map((d) => d.value));
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <ul className="space-y-4" aria-label="Revenue by category, last 30 days">
      {data.map((d) => {
        const share = (d.value / total) * 100;
        const active = hover === d.category;
        return (
          <li
            key={d.category}
            onPointerEnter={() => setHover(d.category)}
            onPointerLeave={() => setHover(null)}
            className="group relative -mx-2 cursor-default px-2 py-1"
          >
            <div className="flex items-baseline justify-between gap-3 text-[12px]">
              <span className="text-ink">{d.category}</span>
              <span className="tabular-nums text-subtle">
                {active ? `${share.toFixed(1)}% of total · ` : ""}
                <span className="text-ink">{formatPrice(d.value)}</span>
              </span>
            </div>
            <div className="mt-2 h-2 bg-paper">
              <div
                className={cn("h-full rounded-r-[4px] bg-ink transition-opacity", hover && !active && "opacity-35")}
                style={{ width: `${(d.value / max) * 100}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
