import type { Metadata } from "next";
import { InfoBlock, InfoPage } from "@/components/info-page";

export const metadata: Metadata = {
  title: "Returns & Exchanges",
  description: "Free returns within 30 days, exchanges and refund process at De Lux.",
};

const STEPS = [
  ["Request", "Sign in to your account, open the order and select the pieces you wish to return."],
  ["Pack", "Use the original packaging and attach the prepaid label we email to you."],
  ["Drop off", "Leave the parcel at any partner point or book a free courier collection."],
  ["Refund", "Once received and checked, your refund is issued within 5 business days."],
];

export default function ReturnsPage() {
  return (
    <InfoPage
      eyebrow="Returns"
      title={
        <>
          Returns &amp; <em>exchanges</em>
        </>
      }
      intro="Changed your mind? Returns are free within 30 days of delivery, from anywhere in Europe."
    >
      <ol className="grid gap-px bg-stone sm:grid-cols-2">
        {STEPS.map(([t, d], i) => (
          <li key={t} className="bg-white p-8">
            <span className="font-display text-[40px] italic leading-none text-burgundy">0{i + 1}</span>
            <p className="nav-label mt-6 font-semibold">{t}</p>
            <p className="mt-3 text-[13px] text-subtle">{d}</p>
          </li>
        ))}
      </ol>

      <InfoBlock id="policy" title="Return policy">
        <p>
          Items can be returned within <strong>30 days</strong> of delivery, unworn, unwashed and with all original tags
          attached. For hygiene reasons, earrings and swimwear cannot be returned unless faulty.
        </p>
      </InfoBlock>
      <InfoBlock id="exchanges" title="Exchange policy">
        <p>
          Need a different size? Select <strong>Exchange</strong> when requesting your return and we will ship the new
          size as soon as your parcel is scanned by the carrier — at no extra cost.
        </p>
      </InfoBlock>
      <InfoBlock id="refunds" title="Refund process">
        <p>
          Refunds are issued to the original payment method. Card and Apple / Google Pay refunds usually appear within
          3–5 business days; PayPal refunds are instant once processed.
        </p>
      </InfoBlock>
    </InfoPage>
  );
}
