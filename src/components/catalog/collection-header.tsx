import Image from "next/image";
import Link from "next/link";

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-subtle">
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden>/</span>}
            {item.href ? (
              <Link href={item.href} className="hover:text-ink">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-ink">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function CollectionHeader({
  title,
  description,
  image,
  breadcrumb,
}: {
  title: string;
  description: string;
  image?: string;
  breadcrumb: string;
}) {
  return (
    <header className="grid items-end gap-8 pt-8 pb-10 md:pt-12 md:pb-14 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: breadcrumb }]} />
        <h1 className="display animate-rise mt-8 text-[56px] sm:text-[88px]">{title}</h1>
        <p className="animate-rise mt-5 max-w-md text-[14px] text-subtle" style={{ animationDelay: "120ms" }}>
          {description}
        </p>
      </div>
      {image && (
        <div className="relative hidden aspect-[16/10] overflow-hidden lg:col-span-4 lg:col-start-9 lg:block">
          <Image src={image} alt="" fill priority sizes="33vw" className="animate-reveal object-cover" />
        </div>
      )}
    </header>
  );
}
