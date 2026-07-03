import { prisma } from "@/lib/prisma";
import { vehicleTitle } from "@/lib/format";
import NewLeadForm from "@/components/admin/NewLeadForm";

export const dynamic = "force-dynamic";

export default async function NewLeadPage() {
  const vehicles = await prisma.vehicle.findMany({
    where: { status: { in: ["AVAILABLE", "PENDING"] } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-black">Registrar cliente</h1>
      <p className="mb-6 mt-1 text-sm text-neutral-500">
        Para clientes que llegan por Marketplace, llamada o visita al lote — así todo tu
        seguimiento queda en un solo lugar.
      </p>
      <NewLeadForm
        vehicles={vehicles.map((v) => ({ id: v.id, label: vehicleTitle(v) }))}
      />
    </div>
  );
}
