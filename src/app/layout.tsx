import type { Metadata } from "next";
import { Bodoni_Moda, Manrope, Mrs_Saint_Delafield } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-bodoni",
  display: "swap",
});
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const signature = Mrs_Saint_Delafield({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-signature",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://delux-studio.com"),
  title: { default: "DE LUX — Parisian Modern Wardrobe", template: "%s — DE LUX" },
  description:
    "Coats, trench, tailoring, shirts and essentials inspired by Parisian elegance and modern simplicity. Autumn / Winter 2026.",
  openGraph: { siteName: "DE LUX", type: "website", locale: "en_GB" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bodoni.variable} ${manrope.variable} ${signature.variable}`}>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
