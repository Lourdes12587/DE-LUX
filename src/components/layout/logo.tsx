import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <Link href="/" aria-label="De Lux — home" className={cn("group flex flex-col items-center leading-none", className)}>
      <span
        className={cn(
          "font-display tracking-[0.18em] transition-all duration-500 ease-editorial",
          compact ? "text-[22px] sm:text-[24px]" : "text-[22px] sm:text-[30px]",
        )}
      >
        DE LUX
      </span>
      <span
        className={cn(
          "mt-1 text-[8px] font-medium uppercase tracking-[0.5em] text-subtle transition-all duration-500",
          compact && "sm:h-0 sm:overflow-hidden sm:opacity-0",
        )}
      >
        Studio · Paris
      </span>
    </Link>
  );
}
