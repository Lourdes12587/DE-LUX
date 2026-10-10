"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  "The New Edition — Autumn / Winter 2026",
  "Complimentary shipping on orders over €150",
  "Free returns within 30 days",
];

export function AnnouncementBar() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % MESSAGES.length), 4500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="bg-burgundy text-white" role="region" aria-label="Announcements">
      <p
        key={i}
        aria-live="polite"
        className="eyebrow animate-in fade-in slide-in-from-bottom-1 flex h-9 items-center justify-center px-4 text-center duration-500"
      >
        {MESSAGES[i]}
      </p>
    </div>
  );
}
