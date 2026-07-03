import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";

// Manually register a lead (phone call, walk-in, Marketplace message, etc.)
export async function POST(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.name) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }
  const lead = await prisma.lead.create({
    data: {
      name: String(body.name).slice(0, 120),
      phone: body.phone || null,
      email: body.email || null,
      message: body.message || "",
      source: body.source || "PHONE",
      vehicleId: body.vehicleId || null,
    },
  });
  return NextResponse.json({ ok: true, id: lead.id });
}
