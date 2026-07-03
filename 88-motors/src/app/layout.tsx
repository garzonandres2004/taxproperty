import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "88 Motors | Quality Used Cars",
  description:
    "88 Motors - quality pre-owned vehicles at great prices. Browse our inventory online.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-50 text-neutral-900">{children}</body>
    </html>
  );
}
