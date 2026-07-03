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
  if (body.status) data.status = body.status;
  if ("name" in body) data.name = body.name;
  if ("phone" in body) data.phone = body.phone || null;
  if ("email" in body) data.email = body.email || null;
  if ("source" in body) data.source = body.source;

  const lead = await prisma.lead.update({ where: { id: params.id }, data });

  if (body.note && String(body.note).trim()) {
    await prisma.leadNote.create({
      data: { leadId: params.id, body: String(body.note).trim() },
    });
  }
  return NextResponse.json({ ok: true, id: lead.id });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.lead.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
