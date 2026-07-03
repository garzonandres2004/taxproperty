import Link from "next/link";
import { DEALER } from "@/lib/config";

export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-neutral-800 bg-ink text-neutral-300">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="text-lg font-black uppercase text-white">88 Motors</p>
          <p className="mt-2 text-sm">
            Quality pre-owned vehicles at honest prices. Every car inspected,
            every deal straightforward.
          </p>
        </div>
        <div className="text-sm">
          <p className="mb-2 font-bold uppercase text-white">Visit us</p>
          <p>{DEALER.address}</p>
          <p className="mt-1">
            <a href={`tel:${DEALER.phone.replace(/[^\d+]/g, "")}`} className="hover:text-white">
              {DEALER.phone}
            </a>
          </p>
        </div>
        <div className="text-sm">
          <p className="mb-2 font-bold uppercase text-white">Quick links</p>
          <ul className="space-y-1">
            <li><Link href="/inventory" className="hover:text-white">Browse inventory</Link></li>
            <li><Link href="/contact" className="hover:text-white">Contact us</Link></li>
            <li><Link href="/admin" className="hover:text-white">Dealer login</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-neutral-800 py-4 text-center text-xs text-neutral-500">
        © {new Date().getFullYear()} 88 Motors. All rights reserved.
      </div>
    </footer>
  );
}
