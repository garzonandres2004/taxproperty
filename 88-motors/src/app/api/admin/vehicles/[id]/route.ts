import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const data: any = {};
  const fields = [
    "stockNumber", "vin", "trim", "bodyStyle", "condition", "exteriorColor",
    "interiorColor", "transmission", "fuelType", "drivetrain", "engine",
    "titleStatus", "description", "features", "status", "make", "model",
  ];
  for (const f of fields) if (f in body) data[f] = body[f] === "" ? null : body[f];
  if (data.description === null) data.description = "";
  if (data.features === null) data.features = "";
  if ("year" in body) data.year = Number(body.year);
  if ("mileage" in body) data.mileage = Number(body.mileage) || 0;
  if ("price" in body) data.price = Number(body.price) || 0;
  if ("cost" in body) data.cost = body.cost === "" || body.cost == null ? null : Number(body.cost);
  if ("featured" in body) data.featured = Boolean(body.featured);
  if ("soldPrice" in body) data.soldPrice = body.soldPrice == null || body.soldPrice === "" ? null : Number(body.soldPrice);
  if (body.status === "SOLD") data.soldAt = new Date();
  if (body.status && body.status !== "SOLD") { data.soldAt = null; data.soldPrice = null; }

  // Replace photo set when provided (ordered list of URLs).
  if (Array.isArray(body.photos)) {
    await prisma.photo.deleteMany({ where: { vehicleId: params.id } });
    data.photos = {
      create: body.photos.map((url: string, i: number) => ({ url, sortOrder: i })),
    };
  }

  const vehicle = await prisma.vehicle.update({ where: { id: params.id }, data });
  return NextResponse.json({ ok: true, id: vehicle.id });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.vehicle.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
