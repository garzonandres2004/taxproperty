import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { money, dateShort, vehicleTitle, LEAD_STATUS_LABELS, LEAD_SOURCE_LABELS } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [available, pending, soldThisMonth, newLeads, inventoryValue, recentLeads, soldVehicles] =
    await Promise.all([
      prisma.vehicle.count({ where: { status: "AVAILABLE" } }),
      prisma.vehicle.count({ where: { status: "PENDING" } }),
      prisma.vehicle.count({ where: { status: "SOLD", soldAt: { gte: monthStart } } }),
      prisma.lead.count({ where: { status: "NEW" } }),
      prisma.vehicle.aggregate({
        where: { status: { in: ["AVAILABLE", "PENDING"] } },
        _sum: { price: true },
      }),
      prisma.lead.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { vehicle: true },
      }),
      prisma.vehicle.findMany({
        where: { status: "SOLD", soldAt: { gte: monthStart } },
        select: { soldPrice: true, cost: true },
      }),
    ]);

  const profit = soldVehicles.reduce(
    (sum, v) => sum + (v.soldPrice != null && v.cost != null ? v.soldPrice - v.cost : 0),
    0
  );

  const stats = [
    { label: "Carros disponibles", value: available, href: "/admin/vehicles" },
    { label: "Apartados", value: pending, href: "/admin/vehicles?status=PENDING" },
    { label: "Vendidos este mes", value: soldThisMonth, href: "/admin/vehicles?status=SOLD" },
    { label: "Clientes nuevos", value: newLeads, href: "/admin/leads?status=NEW" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-black">Dashboard</h1>
        <div className="flex gap-2">
          <Link href="/admin/vehicles/new" className="btn-primary text-sm">＋ Agregar carro</Link>
          <Link href="/admin/leads/new" className="btn-secondary text-sm">＋ Registrar cliente</Link>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card p-5 transition hover:shadow-md">
            <p className="text-3xl font-black">{s.value}</p>
            <p className="mt-1 text-sm text-neutral-500">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <p className="text-sm text-neutral-500">Valor del inventario en venta</p>
          <p className="mt-1 text-2xl font-black text-brand">
            {money(inventoryValue._sum.price || 0)}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-neutral-500">Ganancia del mes (ventas con costo registrado)</p>
          <p className="mt-1 text-2xl font-black text-green-600">{money(profit)}</p>
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-black">Últimos clientes interesados</h2>
          <Link href="/admin/leads" className="text-sm font-semibold text-brand hover:underline">
            Ver todos →
          </Link>
        </div>
        {recentLeads.length === 0 ? (
          <p className="card p-6 text-center text-sm text-neutral-500">
            Aún no hay clientes registrados. Los mensajes de la página web aparecerán aquí.
          </p>
        ) : (
          <div className="card divide-y divide-neutral-100">
            {recentLeads.map((lead) => (
              <Link
                key={lead.id}
                href={`/admin/leads/${lead.id}`}
                className="flex items-center justify-between gap-4 p-4 hover:bg-neutral-50"
              >
                <div>
                  <p className="font-semibold">{lead.name}</p>
                  <p className="text-sm text-neutral-500">
                    {lead.vehicle ? vehicleTitle(lead.vehicle) : "Consulta general"} ·{" "}
                    {LEAD_SOURCE_LABELS[lead.source] || lead.source} · {dateShort(lead.createdAt)}
                  </p>
                </div>
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold">
                  {LEAD_STATUS_LABELS[lead.status] || lead.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
