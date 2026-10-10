import { ArrowDownRight, ArrowUpRight, CheckCircle2, Clock, MinusCircle, RotateCcw, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && <p className="eyebrow text-burgundy">{eyebrow}</p>}
        <h1 className="display mt-3 text-[40px] sm:text-[48px]">{title}</h1>
        {description && <p className="mt-3 max-w-xl text-[13px] text-subtle">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("border border-stone bg-white", className)}>
      {title && (
        <header className="flex items-center justify-between gap-4 border-b border-stone px-5 py-4 sm:px-6">
          <h2 className="nav-label font-semibold">{title}</h2>
          {action}
        </header>
      )}
      <div className={cn("p-5 sm:p-6", bodyClassName)}>{children}</div>
    </section>
  );
}

export function StatTile({
  label,
  value,
  delta,
  hint,
  lowerIsBetter,
}: {
  label: string;
  value: string;
  delta?: number;
  hint?: string;
  /** For metrics like refunds, where a decrease is the good outcome. */
  lowerIsBetter?: boolean;
}) {
  const up = (delta ?? 0) >= 0;
  const good = lowerIsBetter ? !up : up;
  return (
    <div className="min-w-0 border border-stone bg-white p-4 sm:p-6">
      <p className="eyebrow text-subtle">{label}</p>
      <p className="mt-3 truncate font-display text-[24px] leading-none tabular-nums sm:mt-4 sm:text-[40px]">{value}</p>
      <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-subtle sm:mt-4 sm:text-[12px]">
        {delta != null && (
          <span className={cn("inline-flex items-center gap-0.5 font-semibold", good ? "text-good" : "text-critical")}>
            {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
        {hint}
      </p>
    </div>
  );
}

const STATUS = {
  good: { cls: "text-good bg-good/[0.08]", icon: CheckCircle2 },
  warning: { cls: "text-warning bg-warning/[0.1]", icon: Clock },
  critical: { cls: "text-critical bg-critical/[0.08]", icon: XCircle },
  neutral: { cls: "text-subtle bg-stone/60", icon: MinusCircle },
  info: { cls: "text-ink bg-stone/60", icon: RotateCcw },
} as const;

export type StatusTone = keyof typeof STATUS;

/** Status pill — always icon + label, never colour alone. */
export function StatusBadge({ tone, children }: { tone: StatusTone; children: React.ReactNode }) {
  const s = STATUS[tone];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium whitespace-nowrap", s.cls)}>
      <s.icon className="size-3" strokeWidth={2} aria-hidden />
      {children}
    </span>
  );
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-paper font-display text-ink ring-1 ring-stone",
        size === "sm" && "size-7 text-[11px]",
        size === "md" && "size-9 text-[13px]",
        size === "lg" && "size-16 text-[22px]",
      )}
    >
      {initials}
    </span>
  );
}

/** Underline-style segmented filter used above tables. */
export function FilterTabs<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-6 overflow-x-auto border-b border-stone [scrollbar-width:none]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "nav-label -mb-px shrink-0 border-b py-3 transition-colors",
            value === o.value ? "border-ink text-ink" : "border-transparent text-subtle hover:text-ink",
          )}
        >
          {o.label}
          {o.count != null && <span className="ml-1.5 text-subtle">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  id: string;
}) {
  return (
    <div className="flex h-10 min-w-0 flex-1 items-center gap-2 border border-stone bg-white px-3 focus-within:border-ink sm:max-w-xs">
      <label htmlFor={id} className="sr-only">
        {placeholder}
      </label>
      <svg aria-hidden viewBox="0 0 24 24" className="size-4 shrink-0 fill-none stroke-subtle" strokeWidth={1.25}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-[13px] outline-none placeholder:text-subtle/70 focus-visible:outline-none"
      />
    </div>
  );
}

export const th = "eyebrow px-4 py-3 text-left font-semibold text-subtle first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6";
export const td = "px-4 py-3.5 align-middle first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6";
