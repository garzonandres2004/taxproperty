import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { money, miles, vehicleTitle, VEHICLE_STATUSES, VEHICLE_STATUS_LABELS } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-neutral-100 text-neutral-600",
  AVAILABLE: "bg-green-100 text-green-800",
  PENDING: "bg-amber-100 text-amber-800",
  SOLD: "bg-neutral-800 text-white",
};

export default async function AdminVehiclesPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const where = searchParams.status ? { status: searchParams.status } : {};
  const vehicles = await prisma.vehicle.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      photos: { orderBy: { sortOrder: "asc" }, take: 1 },
      socialPosts: true,
      _count: { select: { leads: true } },
    },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-black">Inventario</h1>
        <Link href="/admin/vehicles/new" className="btn-primary text-sm">
          ＋ Agregar carro
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/admin/vehicles"
          className={`rounded-full px-3 py-1 text-sm font-semibold ${!searchParams.status ? "bg-ink text-white" : "bg-white border border-neutral-300"}`}
        >
          Todos
        </Link>
        {VEHICLE_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/vehicles?status=${s}`}
            className={`rounded-full px-3 py-1 text-sm font-semibold ${searchParams.status === s ? "bg-ink text-white" : "bg-white border border-neutral-300"}`}
          >
            {VEHICLE_STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      {vehicles.length === 0 ? (
        <p className="card mt-6 p-10 text-center text-neutral-500">
          No hay carros aquí todavía.{" "}
          <Link href="/admin/vehicles/new" className="font-semibold text-brand hover:underline">
            Agrega el primero
          </Link>
          .
        </p>
      ) : (
        <div className="card mt-6 divide-y divide-neutral-100">
          {vehicles.map((v) => {
            const platforms = new Set(v.socialPosts.map((p) => p.platform));
            return (
              <div key={v.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-neutral-200">
                  {v.photos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.photos[0].url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-2xl">🚗</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/vehicles/${v.id}`} className="font-bold hover:text-brand">
                    {vehicleTitle(v)}
                  </Link>
                  <p className="text-sm text-neutral-500">
                    {money(v.price)} · {miles(v.mileage)} · {v._count.leads} interesado(s)
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] font-bold">
                    <span className={`rounded px-2 py-0.5 ${STATUS_STYLES[v.status] || ""}`}>
                      {VEHICLE_STATUS_LABELS[v.status] || v.status}
                    </span>
                    {platforms.has("MARKETPLACE") && (
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-800">Marketplace ✓</span>
                    )}
                    {platforms.has("FACEBOOK") && (
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-800">Facebook ✓</span>
                    )}
                    {platforms.has("INSTAGRAM") && (
                      <span className="rounded bg-pink-100 px-2 py-0.5 text-pink-800">Instagram ✓</span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link href={`/admin/vehicles/${v.id}/publish`} className="btn-primary !px-3 !py-1.5 text-xs">
                    📣 Publicar
                  </Link>
                  <Link href={`/admin/vehicles/${v.id}`} className="btn-secondary !px-3 !py-1.5 text-xs">
                    ✏️ Editar
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
