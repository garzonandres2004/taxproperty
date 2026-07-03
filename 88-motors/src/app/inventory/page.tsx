import { prisma } from "@/lib/prisma";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import VehicleCard from "@/components/VehicleCard";

export const dynamic = "force-dynamic";

type Search = {
  q?: string;
  make?: string;
  maxPrice?: string;
  sort?: string;
};

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const where: any = { status: { in: ["AVAILABLE", "PENDING"] } };
  if (searchParams.make) where.make = searchParams.make;
  if (searchParams.maxPrice && Number(searchParams.maxPrice) > 0) {
    where.price = { lte: Number(searchParams.maxPrice) };
  }
  if (searchParams.q) {
    const q = searchParams.q;
    where.OR = [
      { make: { contains: q } },
      { model: { contains: q } },
      { trim: { contains: q } },
      { description: { contains: q } },
    ];
  }

  const orderBy: any =
    searchParams.sort === "price_asc"
      ? { price: "asc" }
      : searchParams.sort === "price_desc"
      ? { price: "desc" }
      : searchParams.sort === "mileage"
      ? { mileage: "asc" }
      : { createdAt: "desc" };

  const [vehicles, makes] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      orderBy,
      include: { photos: { orderBy: { sortOrder: "asc" }, take: 1 } },
    }),
    prisma.vehicle.findMany({
      where: { status: { in: ["AVAILABLE", "PENDING"] } },
      select: { make: true },
      distinct: ["make"],
      orderBy: { make: "asc" },
    }),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto min-h-[60vh] max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-black uppercase">Our inventory</h1>
        <p className="mt-1 text-neutral-500">{vehicles.length} vehicles</p>

        <form className="card mt-6 grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto_auto_auto]">
          <input
            name="q"
            defaultValue={searchParams.q || ""}
            placeholder="Search make, model..."
            className="input"
          />
          <select name="make" defaultValue={searchParams.make || ""} className="input sm:w-40">
            <option value="">All makes</option>
            {makes.map((m) => (
              <option key={m.make} value={m.make}>{m.make}</option>
            ))}
          </select>
          <select name="maxPrice" defaultValue={searchParams.maxPrice || ""} className="input sm:w-44">
            <option value="">Any price</option>
            <option value="5000">Under $5,000</option>
            <option value="10000">Under $10,000</option>
            <option value="15000">Under $15,000</option>
            <option value="20000">Under $20,000</option>
            <option value="30000">Under $30,000</option>
          </select>
          <select name="sort" defaultValue={searchParams.sort || ""} className="input sm:w-44">
            <option value="">Newest first</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="mileage">Lowest mileage</option>
          </select>
          <button className="btn-primary">Filter</button>
        </form>

        {vehicles.length === 0 ? (
          <p className="card mt-8 p-10 text-center text-neutral-500">
            No vehicles match your search. Try clearing the filters.
          </p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((v) => (
              <VehicleCard key={v.id} vehicle={v} />
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
