"use client";

import { useEffect, useRef, useState } from "react";
import { formatPrice } from "@/lib/format";

type Point = { date: string; value: number };

const H = 340;
const PAD = { top: 16, right: 12, bottom: 28, left: 48 };
const fmtDay = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const fmtK = (v: number) => (v >= 1000 ? `€${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : `€${v}`);

/** Round step from 1-2-2.5-5 ×10ⁿ so axis labels read cleanly. */
function niceStep(raw: number) {
  const p = 10 ** Math.floor(Math.log10(raw));
  return ([1, 2, 2.5, 5, 10].find((m) => m * p >= raw) ?? 10) * p;
}


/** Single-series area chart with crosshair + tooltip. Title of the panel names the series, so no legend. */
export function RevenueChart({ data }: { data: Point[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const step = niceStep(Math.max(...data.map((d) => d.value)) / 4);
  const max = Math.ceil(Math.max(...data.map((d) => d.value)) / step) * step;
  const innerW = Math.max(width - PAD.left - PAD.right, 10);
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (i / (data.length - 1)) * innerW;
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;

  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join("");
  const area = `${line}L${x(data.length - 1)},${y(0)}L${x(0)},${y(0)}Z`;
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
  const last = data.length - 1;
  const xTicks = data.map((_, i) => i).filter((i) => (i % 7 === 0 && last - i >= 4) || i === last);

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left) / r.width) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  };

  const h = hover != null ? data[hover] : null;

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => setAsTable((t) => !t)}
          className="text-[11px] text-subtle underline underline-offset-4 hover:text-ink"
        >
          {asTable ? "View as chart" : "View as table"}
        </button>
      </div>

      {asTable ? (
        <div className="max-h-[340px] overflow-y-auto">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-stone text-left">
                <th className="eyebrow py-2 font-semibold text-subtle">Date</th>
                <th className="eyebrow py-2 text-right font-semibold text-subtle">Net revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.date} className="border-b border-stone/60">
                  <td className="py-1.5">{fmtDay.format(new Date(d.date))}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatPrice(d.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={wrap} className="relative">
          <svg
            width={width}
            height={H}
            role="img"
            aria-label={`Net revenue, last 30 days. From ${formatPrice(data[0].value)} to ${formatPrice(data[data.length - 1].value)}.`}
            className="block overflow-visible"
          >
            {/* recessive grid + y axis labels */}
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--stone)" strokeWidth={t === 0 ? 1 : 0.75} strokeDasharray={t === 0 ? undefined : "2 4"} />
                <text x={PAD.left - 10} y={y(t)} dy="0.32em" textAnchor="end" className="fill-subtle text-[10px] tabular-nums">
                  {fmtK(t)}
                </text>
              </g>
            ))}
            {xTicks.map((i) => (
              <text key={i} x={x(i)} y={H - 8} textAnchor={i === data.length - 1 ? "end" : "middle"} className="fill-subtle text-[10px]">
                {fmtDay.format(new Date(data[i].date))}
              </text>
            ))}

            <path d={area} fill="var(--burgundy)" fillOpacity={0.07} />
            <path d={line} fill="none" stroke="var(--burgundy)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

            {/* direct label on the latest value only */}
            {hover == null && (
              <g>
                <circle cx={x(data.length - 1)} cy={y(data[data.length - 1].value)} r={4} fill="var(--burgundy)" stroke="#fff" strokeWidth={2} />
              </g>
            )}

            {h && hover != null && (
              <g pointerEvents="none">
                <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={y(0)} stroke="var(--ink)" strokeWidth={1} strokeOpacity={0.35} />
                <circle cx={x(hover)} cy={y(h.value)} r={5} fill="var(--burgundy)" stroke="#fff" strokeWidth={2} />
              </g>
            )}

            {/* hit target covers the whole plot, larger than the marks */}
            <rect
              x={PAD.left}
              y={PAD.top}
              width={innerW}
              height={innerH}
              fill="transparent"
              onPointerMove={onMove}
              onPointerLeave={() => setHover(null)}
            />
          </svg>

          {h && hover != null && (
            <div
              role="status"
              className="pointer-events-none absolute top-0 z-10 min-w-[132px] -translate-x-1/2 border border-stone bg-white px-3 py-2 shadow-[0_8px_24px_-12px_rgba(17,17,17,0.25)]"
              style={{ left: Math.min(Math.max(x(hover), 70), width - 70) }}
            >
              <p className="text-[11px] text-subtle">{fmtDay.format(new Date(h.date))}</p>
              <p className="mt-0.5 text-[14px] font-semibold tabular-nums">{formatPrice(h.value)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
