"use client";

import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const ROWS = [
  ["XS", "34", "80–83", "62–65", "88–91"],
  ["S", "36", "84–87", "66–69", "92–95"],
  ["M", "38", "88–91", "70–73", "96–99"],
  ["L", "40", "92–96", "74–78", "100–104"],
  ["XL", "42", "97–101", "79–83", "105–109"],
];

export function SizeGuide() {
  return (
    <Dialog>
      <DialogTrigger className="text-[11px] uppercase tracking-[0.16em] text-subtle underline underline-offset-4 hover:text-ink">
        Size guide
      </DialogTrigger>
      <DialogContent className="max-w-2xl border-0 p-8 sm:p-12">
        <DialogTitle className="display text-[36px]">Size guide</DialogTitle>
        <DialogDescription className="text-[13px] text-subtle">
          Body measurements in centimetres. If you are between sizes, we recommend sizing up for outerwear.
        </DialogDescription>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-ink">
                {["Size", "EU", "Bust", "Waist", "Hips"].map((h) => (
                  <th key={h} scope="col" className="eyebrow py-3 pr-4 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r[0]} className="border-b border-stone">
                  {r.map((c, i) =>
                    i === 0 ? (
                      <th key={i} scope="row" className="py-3 pr-4 font-semibold">
                        {c}
                      </th>
                    ) : (
                      <td key={i} className="py-3 pr-4 tabular-nums">
                        {c}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
