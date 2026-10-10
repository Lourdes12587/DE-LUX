"use client";

import { useState } from "react";
import { InfoBlock, InfoPage } from "@/components/info-page";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FAQ = [
  ["How do I find my size?", "Each product page includes a size guide with body measurements. Between sizes? Size up for outerwear."],
  ["Can I change my order?", "Orders can be edited within 30 minutes of purchase. Contact us as soon as possible."],
  ["Which payment methods do you accept?", "Visa, Mastercard, American Express, Apple Pay, Google Pay and PayPal — all processed securely by Stripe."],
  ["Do you ship outside Europe?", "Not yet. We currently ship to the European Union, and we are working on more destinations."],
];

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <InfoPage
      eyebrow="Contact"
      title={
        <>
          Client <em>care</em>
        </>
      }
      intro="Questions about an order, a size or a piece? We reply within 24 hours, Monday to Saturday."
      aside={
        <div id="stores" className="space-y-8 text-[13px]">
          <div>
            <p className="nav-label font-semibold">Email</p>
            <p className="mt-2 text-subtle">hello@delux-studio.com</p>
          </div>
          <div>
            <p className="nav-label font-semibold">Paris studio</p>
            <address className="mt-2 not-italic text-subtle">
              18 Rue Charlot
              <br />
              75003 Paris, France
            </address>
          </div>
          <div>
            <p className="nav-label font-semibold">Hours</p>
            <p className="mt-2 text-subtle">Mon – Sat, 10:00 – 19:00</p>
          </div>
        </div>
      }
    >
      <InfoBlock title="Write to us">
        {sent ? (
          <p role="status" className="font-display text-[24px] italic text-ink">
            Thank you — we&rsquo;ll be in touch shortly.
          </p>
        ) : (
          <form
            className="grid gap-7 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
          >
            <div>
              <label htmlFor="c-name" className="eyebrow">Name</label>
              <input id="c-name" required autoComplete="name" className="field" />
            </div>
            <div>
              <label htmlFor="c-email" className="eyebrow">Email</label>
              <input id="c-email" type="email" required autoComplete="email" className="field" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="c-order" className="eyebrow">Order number (optional)</label>
              <input id="c-order" placeholder="PH-2026-" className="field" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="c-msg" className="eyebrow">Message</label>
              <textarea id="c-msg" required rows={4} className="field h-auto resize-none py-3" />
            </div>
            <button type="submit" className="btn btn-primary sm:col-span-2 sm:justify-self-start">
              Send message
            </button>
          </form>
        )}
      </InfoBlock>

      <InfoBlock id="faq" title="Frequently asked">
        <Accordion type="single" collapsible className="border-t border-stone">
          {FAQ.map(([q, a]) => (
            <AccordionItem key={q} value={q}>
              <AccordionTrigger className="py-5 text-[14px] font-medium text-ink hover:no-underline">{q}</AccordionTrigger>
              <AccordionContent className="text-[14px] text-subtle">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </InfoBlock>
    </InfoPage>
  );
}
