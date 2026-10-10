import type { Metadata } from "next";
import { InfoBlock, InfoPage } from "@/components/info-page";
import { formatPrice } from "@/lib/format";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_METHODS } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Shipping",
  description: "Delivery times, shipping costs and destinations for De Lux orders.",
};

const COUNTRIES = [
  ["Spain", "2–4 days"],
  ["France", "2–4 days"],
  ["Italy", "3–5 days"],
  ["Germany", "3–5 days"],
  ["Portugal", "3–5 days"],
  ["Rest of Europe", "4–7 days"],
];

export default function ShippingPage() {
  return (
    <InfoPage
      eyebrow="Shipping & Returns"
      title={
        <>
          Shipping, <em>simply</em>
        </>
      }
      intro="Every order is packed by hand in our Paris studio and shipped in recyclable packaging."
    >
      <div className="grid gap-px bg-stone sm:grid-cols-3">
        {[
          ...SHIPPING_METHODS.map((m) => ({ name: m.name, eta: m.eta, price: formatPrice(m.price) })),
          { name: "Free Shipping", eta: `Orders over ${formatPrice(FREE_SHIPPING_THRESHOLD)}`, price: "€0" },
        ].map((m) => (
          <div key={m.name} className="bg-white p-8">
            <p className="nav-label font-semibold">{m.name}</p>
            <p className="mt-2 text-[13px] text-subtle">{m.eta}</p>
            <p className="mt-8 font-display text-[40px] leading-none">{m.price}</p>
          </div>
        ))}
      </div>

      <InfoBlock id="countries" title="Destinations">
        <table className="w-full text-left text-[14px]">
          <thead>
            <tr className="border-b border-ink">
              <th scope="col" className="eyebrow py-3 font-semibold text-ink">Country</th>
              <th scope="col" className="eyebrow py-3 font-semibold text-ink">Standard delivery</th>
            </tr>
          </thead>
          <tbody>
            {COUNTRIES.map(([c, d]) => (
              <tr key={c} className="border-b border-stone">
                <th scope="row" className="py-3 font-normal text-ink">{c}</th>
                <td className="py-3">{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </InfoBlock>

      <InfoBlock id="times" title="Delivery times">
        <p>
          Orders placed before <strong>2pm CET</strong> on business days are dispatched the same day. You will receive a
          tracking link by email as soon as your parcel leaves the studio.
        </p>
        <p>During sale periods and new collection launches, dispatch may take up to one additional business day.</p>
      </InfoBlock>

      <InfoBlock id="duties" title="Duties & taxes">
        <p>All prices include VAT. There are no additional duties for deliveries within the European Union.</p>
      </InfoBlock>
    </InfoPage>
  );
}
