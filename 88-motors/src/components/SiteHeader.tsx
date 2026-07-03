import Link from "next/link";
import Logo from "./Logo";
import { DEALER } from "@/lib/config";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-800 bg-ink text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Logo />
        <nav className="hidden items-center gap-6 text-sm font-semibold sm:flex">
          <Link href="/" className="hover:text-brand-light">Home</Link>
          <Link href="/inventory" className="hover:text-brand-light">Inventory</Link>
          <Link href="/contact" className="hover:text-brand-light">Contact</Link>
        </nav>
        <a href={`tel:${DEALER.phone.replace(/[^\d+]/g, "")}`} className="btn-primary !py-2 text-sm">
          📞 {DEALER.phone}
        </a>
      </div>
      <nav className="flex items-center justify-center gap-6 border-t border-neutral-800 py-2 text-sm font-semibold sm:hidden">
        <Link href="/" className="hover:text-brand-light">Home</Link>
        <Link href="/inventory" className="hover:text-brand-light">Inventory</Link>
        <Link href="/contact" className="hover:text-brand-light">Contact</Link>
      </nav>
    </header>
  );
}
