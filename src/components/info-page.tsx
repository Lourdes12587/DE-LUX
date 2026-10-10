import Link from "next/link";
import { Breadcrumbs } from "@/components/catalog/collection-header";

export function InfoPage({
  eyebrow,
  title,
  intro,
  children,
  aside,
}: {
  eyebrow: string;
  title: React.ReactNode;
  intro: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="container-edit pt-8 pb-24 md:pt-12">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: eyebrow }]} />
      <header className="mt-10 max-w-3xl">
        <p className="eyebrow text-burgundy">{eyebrow}</p>
        <h1 className="display mt-5 text-[52px] sm:text-[80px]">{title}</h1>
        <p className="mt-6 max-w-xl text-[15px] text-subtle">{intro}</p>
      </header>
      <div className="mt-16 grid gap-12 border-t border-stone pt-12 lg:grid-cols-12">
        <div className="space-y-14 lg:col-span-8">{children}</div>
        <aside className="lg:col-span-3 lg:col-start-10">
          {aside ?? (
            <div className="bg-paper p-8">
              <p className="nav-label font-semibold">Need help?</p>
              <p className="mt-4 text-[13px] text-subtle">Our client care team replies within 24 hours, Monday to Saturday.</p>
              <Link href="/contact" className="link-underline mt-6">
                Contact us
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export function InfoBlock({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className="scroll-mt-40">
      <h2 id={id ? `${id}-title` : undefined} className="font-display text-[30px] sm:text-[36px]">
        {title}
      </h2>
      <div className="mt-5 space-y-4 text-[14px] leading-relaxed text-subtle [&_strong]:font-semibold [&_strong]:text-ink">
        {children}
      </div>
    </section>
  );
}
