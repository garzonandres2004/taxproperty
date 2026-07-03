import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  dateShort,
  money,
  vehicleTitle,
  LEAD_SOURCE_LABELS,
} from "@/lib/format";
import LeadActions from "@/components/admin/LeadActions";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
    include: {
      vehicle: { include: { photos: { orderBy: { sortOrder: "asc" }, take: 1 } } },
      notes: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!lead) notFound();

  const phoneDigits = lead.phone?.replace(/[^\d+]/g, "") || "";

  return (
    <div>
      <Link href="/admin/leads" className="text-sm font-semibold text-neutral-500 hover:text-ink">
        ← Volver a clientes
      </Link>

      <div className="mt-3 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <div className="card p-5">
            <h1 className="text-2xl font-black">{lead.name}</h1>
            <p className="mt-1 text-sm text-neutral-500">
              {LEAD_SOURCE_LABELS[lead.source] || lead.source} · {dateShort(lead.createdAt)}
            </p>

            {lead.message && (
              <div className="mt-4 rounded-lg bg-neutral-50 p-4 text-sm">
                <p className="mb-1 text-xs font-bold uppercase text-neutral-400">Mensaje</p>
                <p className="whitespace-pre-line">{lead.message}</p>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {phoneDigits && (
                <>
                  <a href={`tel:${phoneDigits}`} className="btn-primary text-sm">📞 Llamar</a>
                  <a href={`sms:${phoneDigits}`} className="btn-secondary text-sm">💬 SMS</a>
                  <a
                    href={`https://wa.me/${phoneDigits.replace("+", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary text-sm"
                  >
                    🟢 WhatsApp
                  </a>
                </>
              )}
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="btn-secondary text-sm">✉️ Email</a>
              )}
            </div>
            <div className="mt-3 text-sm text-neutral-500">
              {lead.phone && <p>Teléfono: <span className="font-semibold text-ink">{lead.phone}</span></p>}
              {lead.email && <p>Email: <span className="font-semibold text-ink">{lead.email}</span></p>}
            </div>
          </div>

          <div className="card p-5">
            <LeadActions leadId={lead.id} status={lead.status} />
          </div>

          <div className="card p-5">
            <h2 className="mb-3 font-black">Notas de seguimiento</h2>
            {lead.notes.length === 0 ? (
              <p className="text-sm text-neutral-400">
                Sin notas todavía. Anota cada llamada o acuerdo para no perder el hilo.
              </p>
            ) : (
              <ul className="space-y-3">
                {lead.notes.map((n) => (
                  <li key={n.id} className="rounded-lg bg-neutral-50 p-3 text-sm">
                    <p>{n.body}</p>
                    <p className="mt-1 text-xs text-neutral-400">{dateShort(n.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <aside>
          <div className="card p-5">
            <h2 className="mb-3 font-black">Carro de interés</h2>
            {lead.vehicle ? (
              <Link href={`/admin/vehicles/${lead.vehicle.id}`} className="block">
                <div className="overflow-hidden rounded-lg bg-neutral-200">
                  {lead.vehicle.photos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={lead.vehicle.photos[0].url}
                      alt=""
                      className="aspect-[4/3] w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center text-4xl">🚗</div>
                  )}
                </div>
                <p className="mt-3 font-bold hover:text-brand">{vehicleTitle(lead.vehicle)}</p>
                <p className="text-lg font-black text-brand">{money(lead.vehicle.price)}</p>
              </Link>
            ) : (
              <p className="text-sm text-neutral-400">Consulta general — sin carro específico.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
