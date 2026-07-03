import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  dateShort,
  vehicleTitle,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  LEAD_SOURCE_LABELS,
} from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  NEW: "bg-brand text-white",
  CONTACTED: "bg-blue-100 text-blue-800",
  NEGOTIATING: "bg-amber-100 text-amber-800",
  APPOINTMENT: "bg-purple-100 text-purple-800",
  SOLD: "bg-green-100 text-green-800",
  LOST: "bg-neutral-100 text-neutral-500",
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const where = searchParams.status ? { status: searchParams.status } : {};
  const [leads, counts] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { vehicle: true },
    }),
    prisma.lead.groupBy({ by: ["status"], _count: true }),
  ]);
  const countMap = Object.fromEntries(counts.map((c) => [c.status, c._count]));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">Clientes (Connect)</h1>
          <p className="text-sm text-neutral-500">
            Todos los interesados: página web, Marketplace, llamadas y visitas.
          </p>
        </div>
        <Link href="/admin/leads/new" className="btn-primary text-sm">
          ＋ Registrar cliente
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/admin/leads"
          className={`rounded-full px-3 py-1 text-sm font-semibold ${!searchParams.status ? "bg-ink text-white" : "border border-neutral-300 bg-white"}`}
        >
          Todos ({leads.length && !searchParams.status ? leads.length : counts.reduce((a, c) => a + c._count, 0)})
        </Link>
        {LEAD_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/leads?status=${s}`}
            className={`rounded-full px-3 py-1 text-sm font-semibold ${searchParams.status === s ? "bg-ink text-white" : "border border-neutral-300 bg-white"}`}
          >
            {LEAD_STATUS_LABELS[s]} ({countMap[s] || 0})
          </Link>
        ))}
      </div>

      {leads.length === 0 ? (
        <p className="card mt-6 p-10 text-center text-neutral-500">
          No hay clientes en esta categoría. Los mensajes de la página web llegan aquí
          automáticamente.
        </p>
      ) : (
        <div className="card mt-6 divide-y divide-neutral-100">
          {leads.map((lead) => (
            <Link
              key={lead.id}
              href={`/admin/leads/${lead.id}`}
              className="flex flex-wrap items-center gap-3 p-4 hover:bg-neutral-50"
            >
              <div className="min-w-0 flex-1">
                <p className="font-bold">{lead.name}</p>
                <p className="truncate text-sm text-neutral-500">
                  {lead.vehicle ? `🚗 ${vehicleTitle(lead.vehicle)}` : "Consulta general"}
                  {lead.message ? ` — "${lead.message.slice(0, 60)}${lead.message.length > 60 ? "..." : ""}"` : ""}
                </p>
                <p className="mt-0.5 text-xs text-neutral-400">
                  {LEAD_SOURCE_LABELS[lead.source] || lead.source} · {dateShort(lead.createdAt)}
                  {lead.phone ? ` · ${lead.phone}` : ""}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLES[lead.status] || ""}`}>
                {LEAD_STATUS_LABELS[lead.status] || lead.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
