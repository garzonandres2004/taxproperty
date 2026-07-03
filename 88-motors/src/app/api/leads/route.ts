import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public endpoint: customers submit inquiries from the website (Connect).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.name || (!body.phone && !body.email)) {
    return NextResponse.json(
      { error: "Name and a phone or email are required." },
      { status: 400 }
    );
  }
  const lead = await prisma.lead.create({
    data: {
      name: String(body.name).slice(0, 120),
      phone: body.phone ? String(body.phone).slice(0, 40) : null,
      email: body.email ? String(body.email).slice(0, 120) : null,
      message: body.message ? String(body.message).slice(0, 2000) : "",
      source: "WEBSITE",
      vehicleId: body.vehicleId || null,
    },
  });
  return NextResponse.json({ ok: true, id: lead.id });
}
