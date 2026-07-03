import Link from "next/link";
import { money, miles, vehicleTitle } from "@/lib/format";

type VehicleWithPhotos = {
  id: string;
  year: number;
  make: string;
  model: string;
  trim?: string | null;
  mileage: number;
  price: number;
  status: string;
  transmission?: string | null;
  fuelType?: string | null;
  photos: { url: string }[];
};

export default function VehicleCard({ vehicle }: { vehicle: VehicleWithPhotos }) {
  const photo = vehicle.photos[0]?.url;
  return (
    <Link
      href={`/inventory/${vehicle.id}`}
      className="card group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-neutral-200">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={vehicleTitle(vehicle)}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">🚗</div>
        )}
        {vehicle.status === "PENDING" && (
          <span className="absolute left-2 top-2 rounded bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
            SALE PENDING
          </span>
        )}
        {vehicle.status === "SOLD" && (
          <span className="absolute left-2 top-2 rounded bg-neutral-800 px-2 py-0.5 text-xs font-bold text-white">
            SOLD
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-bold leading-tight">{vehicleTitle(vehicle)}</h3>
        <p className="mt-1 text-sm text-neutral-500">
          {miles(vehicle.mileage)}
          {vehicle.transmission ? ` · ${vehicle.transmission}` : ""}
          {vehicle.fuelType ? ` · ${vehicle.fuelType}` : ""}
        </p>
        <p className="mt-2 text-xl font-black text-brand">{money(vehicle.price)}</p>
      </div>
    </Link>
  );
}
