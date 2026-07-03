import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { vehicleTitle } from "@/lib/format";
import VehicleForm from "@/components/admin/VehicleForm";

export const dynamic = "force-dynamic";

export default async function EditVehiclePage({ params }: { params: { id: string } }) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: params.id },
    include: { photos: { orderBy: { sortOrder: "asc" } } },
  });
  if (!vehicle) notFound();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">{vehicleTitle(vehicle)}</h1>
          <p className="text-sm text-neutral-500">Editar información del carro</p>
        </div>
        <Link href={`/admin/vehicles/${vehicle.id}/publish`} className="btn-primary text-sm">
          📣 Centro de publicación
        </Link>
      </div>
      <VehicleForm vehicle={vehicle} />
    </div>
  );
}
