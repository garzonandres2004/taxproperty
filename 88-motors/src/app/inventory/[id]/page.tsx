import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DEALER } from "@/lib/config";
import { money, miles, vehicleTitle } from "@/lib/format";
import { featureList } from "@/lib/social";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PhotoGallery from "@/components/PhotoGallery";
import LeadForm from "@/components/LeadForm";

export const dynamic = "force-dynamic";

export default async function VehiclePage({ params }: { params: { id: string } }) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: params.id },
    include: { photos: { orderBy: { sortOrder: "asc" } } },
  });
  if (!vehicle || vehicle.status === "DRAFT") notFound();

  const title = vehicleTitle(vehicle);
  const specs: [string, string | null | undefined][] = [
    ["Mileage", miles(vehicle.mileage)],
    ["Condition", vehicle.condition],
    ["Title", vehicle.titleStatus],
    ["Body style", vehicle.bodyStyle],
    ["Transmission", vehicle.transmission],
    ["Fuel type", vehicle.fuelType],
    ["Drivetrain", vehicle.drivetrain],
    ["Engine", vehicle.engine],
    ["Exterior color", vehicle.exteriorColor],
    ["Interior color", vehicle.interiorColor],
    ["VIN", vehicle.vin],
    ["Stock #", vehicle.stockNumber],
  ];
  const feats = featureList(vehicle);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <PhotoGallery photos={vehicle.photos} alt={title} />

            <h1 className="mt-6 text-3xl font-black">{title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="text-3xl font-black text-brand">{money(vehicle.price)}</span>
              {vehicle.status === "PENDING" && (
                <span className="rounded bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">
                  SALE PENDING
                </span>
              )}
              {vehicle.status === "SOLD" && (
                <span className="rounded bg-neutral-200 px-2 py-1 text-xs font-bold text-neutral-700">
                  SOLD
                </span>
              )}
            </div>

            <div className="card mt-6 p-5">
              <h2 className="font-bold uppercase text-neutral-500">Specifications</h2>
              <dl className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                {specs
                  .filter(([, v]) => v)
                  .map(([label, value]) => (
                    <div key={label} className="flex justify-between border-b border-neutral-100 py-1">
                      <dt className="text-neutral-500">{label}</dt>
                      <dd className="font-semibold">{value}</dd>
                    </div>
                  ))}
              </dl>
            </div>

            {feats.length > 0 && (
              <div className="card mt-6 p-5">
                <h2 className="font-bold uppercase text-neutral-500">Features</h2>
                <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  {feats.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <span className="text-green-600">✔</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {vehicle.description && (
              <div className="card mt-6 p-5">
                <h2 className="font-bold uppercase text-neutral-500">Description</h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">
                  {vehicle.description}
                </p>
              </div>
            )}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="card p-5">
              <h2 className="text-lg font-black">Interested in this car?</h2>
              <p className="mb-4 text-sm text-neutral-500">
                Send us a message and we&apos;ll reply fast.
              </p>
              <LeadForm
                vehicleId={vehicle.id}
                defaultMessage={`Hi! I'm interested in the ${title}. Is it still available?`}
              />
              <div className="mt-4 border-t border-neutral-200 pt-4 text-center text-sm">
                <p className="font-semibold">Prefer to talk?</p>
                <a
                  href={`tel:${DEALER.phone.replace(/[^\d+]/g, "")}`}
                  className="mt-1 block text-lg font-black text-brand"
                >
                  {DEALER.phone}
                </a>
                <p className="mt-1 text-neutral-500">{DEALER.address}</p>
              </div>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
