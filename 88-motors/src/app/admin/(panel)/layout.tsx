import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import LogoutButton from "@/components/admin/LogoutButton";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "📊 Dashboard" },
  { href: "/admin/vehicles", label: "🚗 Inventario" },
  { href: "/admin/leads", label: "💬 Clientes (Connect)" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isAdmin()) redirect("/admin/login");

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col bg-ink p-4 text-white sm:flex">
        <Link href="/admin" className="mb-8 flex items-center gap-2 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-lg font-black italic">
            88
          </span>
          <span className="font-black uppercase">Motors</span>
        </Link>
        <nav className="flex-1 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3 py-2 text-sm font-semibold hover:bg-neutral-800"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/"
            target="_blank"
            className="block rounded-lg px-3 py-2 text-sm font-semibold text-neutral-400 hover:bg-neutral-800 hover:text-white"
          >
            🌐 Ver página pública
          </Link>
        </nav>
        <LogoutButton />
      </aside>

      <div className="flex-1">
        <header className="flex items-center gap-4 overflow-x-auto border-b border-neutral-200 bg-white px-4 py-3 sm:hidden">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="whitespace-nowrap text-sm font-semibold">
              {item.label}
            </Link>
          ))}
        </header>
        <main className="mx-auto max-w-5xl p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
