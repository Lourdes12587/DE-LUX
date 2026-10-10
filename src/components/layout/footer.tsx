import Link from "next/link";

const columns = [
  {
    title: "Shop",
    links: [
      ["New In", "/collections/new-in"],
      ["Trench & Coats", "/collections/coats"],
      ["Jackets", "/collections/jackets"],
      ["Shirts", "/collections/shirts"],
      ["Trousers", "/collections/trousers"],
      ["Sale", "/collections/sale"],
    ],
  },
  {
    title: "Customer Care",
    links: [
      ["Contact", "/contact"],
      ["Shipping", "/shipping"],
      ["Returns", "/returns"],
      ["FAQ", "/contact#faq"],
      ["Size Guide", "/contact#faq"],
    ],
  },
  {
    title: "About",
    links: [
      ["Our Story", "/about"],
      ["Journal", "/about#journal"],
      ["Stores", "/contact#stores"],
      ["Careers", "/about#careers"],
    ],
  },
  {
    title: "Follow",
    links: [
      ["Instagram", "https://instagram.com"],
      ["Pinterest", "https://pinterest.com"],
      ["TikTok", "https://tiktok.com"],
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="bg-ink text-white">
      <div className="container-edit pt-20 pb-10 md:pt-28">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-4">
            <p className="font-display text-[34px] leading-none tracking-[0.16em]">DE LUX</p>
            <p className="mt-6 max-w-xs text-[13px] leading-relaxed text-white/60">
              Inspired by Parisian elegance and modern simplicity. Pieces that move with you.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-4 md:col-span-8">
            {columns.map((col) => (
              <div key={col.title}>
                <h3 className="eyebrow text-white/50">{col.title}</h3>
                <ul className="mt-5 space-y-3">
                  {col.links.map(([label, href]) => (
                    <li key={label}>
                      <Link
                        href={href}
                        className="text-[13px] text-white/85 transition-colors hover:text-rose"
                        {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <p
          aria-hidden
          className="font-display mt-20 select-none text-center text-[12vw] leading-[0.8] text-white/[0.06] xl:text-[160px]"
        >
          DE LUX
        </p>

        <div className="mt-10 flex flex-col gap-4 border-t border-white/15 pt-6 text-[11px] text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 DE LUX. All rights reserved.</p>
          <ul className="flex gap-6">
            <li><Link href="/about#privacy" className="hover:text-white">Privacy Policy</Link></li>
            <li><Link href="/about#terms" className="hover:text-white">Terms &amp; Conditions</Link></li>
            <li><Link href="/about#cookies" className="hover:text-white">Cookies</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
