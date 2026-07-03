import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DEALER } from "@/lib/config";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import VehicleCard from "@/components/VehicleCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const featured = await prisma.vehicle.findMany({
    where: { status: { in: ["AVAILABLE", "PENDING"] } },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    take: 6,
    include: { photos: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });
  const availableCount = await prisma.vehicle.count({ where: { status: "AVAILABLE" } });

  return (
    <>
      <SiteHeader />
      <section className="bg-ink text-white">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-brand-light">
            Welcome to 88 Motors
          </p>
          <h1 className="mt-4 text-4xl font-black uppercase leading-tight sm:text-6xl">
            Your next car is <span className="text-brand">here</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-neutral-300">
            Quality pre-owned vehicles, honest prices, and no games.
            {availableCount > 0 && ` ${availableCount} cars ready to drive home today.`}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/inventory" className="btn-primary text-base">
              Browse Inventory
            </Link>
            <a
              href={`tel:${DEALER.phone.replace(/[^\d+]/g, "")}`}
              className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-5 py-2.5 font-semibold hover:bg-white/10"
            >
              📞 {DEALER.phone}
            </a>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4">
        <section className="py-12">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-2xl font-black uppercase">Featured vehicles</h2>
            <Link href="/inventory" className="text-sm font-semibold text-brand hover:underline">
              View all →
            </Link>
          </div>
          {featured.length === 0 ? (
            <p className="card p-8 text-center text-neutral-500">
              New inventory coming soon. Call us at {DEALER.phone}!
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((v) => (
                <VehicleCard key={v.id} vehicle={v} />
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-6 pb-4 sm:grid-cols-3">
          {[
            ["🔍", "Inspected cars", "Every vehicle is checked before it hits the lot."],
            ["💵", "Fair pricing", "Competitive prices with no hidden fees."],
            ["🤝", "Easy process", "Call, text, or message us — we answer fast."],
          ].map(([icon, title, text]) => (
            <div key={title} className="card p-6 text-center">
              <div className="text-3xl">{icon}</div>
              <h3 className="mt-2 font-bold">{title}</h3>
              <p className="mt-1 text-sm text-neutral-500">{text}</p>
            </div>
          ))}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
