import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";

function vehicleData(body: any) {
  return {
    stockNumber: body.stockNumber || null,
    vin: body.vin || null,
    year: Number(body.year),
    make: String(body.make).trim(),
    model: String(body.model).trim(),
    trim: body.trim || null,
    bodyStyle: body.bodyStyle || null,
    mileage: Number(body.mileage) || 0,
    price: Number(body.price) || 0,
    cost: body.cost !== "" && body.cost != null ? Number(body.cost) : null,
    condition: body.condition || "Good",
    exteriorColor: body.exteriorColor || null,
    interiorColor: body.interiorColor || null,
    transmission: body.transmission || null,
    fuelType: body.fuelType || null,
    drivetrain: body.drivetrain || null,
    engine: body.engine || null,
    titleStatus: body.titleStatus || "Clean",
    description: body.description || "",
    features: body.features || "",
    status: body.status || "AVAILABLE",
    featured: Boolean(body.featured),
  };
}

export async function POST(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.make || !body?.model || !body?.year) {
    return NextResponse.json(
      { error: "Año, marca y modelo son obligatorios." },
      { status: 400 }
    );
  }
  const photos: string[] = Array.isArray(body.photos) ? body.photos : [];
  const vehicle = await prisma.vehicle.create({
    data: {
      ...vehicleData(body),
      photos: {
        create: photos.map((url, i) => ({ url, sortOrder: i })),
      },
    },
  });
  return NextResponse.json({ ok: true, id: vehicle.id });
}
