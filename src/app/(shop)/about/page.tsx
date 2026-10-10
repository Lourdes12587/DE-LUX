import type { Metadata } from "next";
import Image from "next/image";
import { InfoBlock, InfoPage } from "@/components/info-page";
import { editorialImages } from "@/lib/data/products";

export const metadata: Metadata = {
  title: "Our Story",
  description: "De Lux is a Paris studio creating modern wardrobe pieces with Parisian elegance.",
};

export default function AboutPage() {
  return (
    <InfoPage
      eyebrow="Our Story"
      title={
        <>
          Made to <em>move</em> with you
        </>
      }
      intro="De Lux was born in a small Paris atelier with a simple conviction: that a few exceptional pieces are worth more than a full wardrobe."
      aside={
        <div className="relative aspect-[4/5] overflow-hidden">
          <Image src={editorialImages.noir} alt="Campaign image from the Midnight Rouge collection" fill sizes="25vw" className="object-cover" />
        </div>
      }
    >
      <InfoBlock id="journal" title="The studio">
        <p>
          We design outerwear, tailoring and essentials in limited runs, working with family-owned mills in Italy and
          Portugal. Each collection is built around a single idea — this season, the quiet drama of a red coat at dusk.
        </p>
        <p className="font-script text-[48px] leading-none text-burgundy">Looking for our stories</p>
      </InfoBlock>
      <InfoBlock id="careers" title="Careers">
        <p>We are always looking for curious, talented people. Send your portfolio to careers@delux-studio.com.</p>
      </InfoBlock>
      <InfoBlock id="privacy" title="Privacy Policy">
        <p>We only collect the data needed to process your order and never sell it to third parties.</p>
      </InfoBlock>
      <InfoBlock id="terms" title="Terms & Conditions">
        <p>Orders are subject to availability. Prices include VAT and are shown in euros.</p>
      </InfoBlock>
      <InfoBlock id="cookies" title="Cookies">
        <p>We use essential cookies to keep your bag and wishlist, and optional analytics cookies with your consent.</p>
      </InfoBlock>
    </InfoPage>
  );
}
