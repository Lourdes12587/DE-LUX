import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  href,
  linkLabel = "View all",
  id,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  id?: string;
}) {
  return (
    <div className="mb-10 flex flex-col gap-6 md:mb-14 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-4 text-burgundy">{eyebrow}</p>}
        <h2 id={id} className="display text-[40px] sm:text-[52px]">
          {title}
        </h2>
        {subtitle && <p className="mt-4 text-[14px] text-subtle">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="link-underline inline-flex items-center gap-2 self-start md:self-auto">
          {linkLabel} <ArrowRight className="size-3" strokeWidth={1.5} />
        </Link>
      )}
    </div>
  );
}
