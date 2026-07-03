import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";

// Mark a vehicle as published on a platform (MARKETPLACE | FACEBOOK | INSTAGRAM).
export async function POST(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.vehicleId || !body?.platform) {
    return NextResponse.json({ error: "vehicleId y platform requeridos" }, { status: 400 });
  }
  const post = await prisma.socialPost.create({
    data: {
      vehicleId: body.vehicleId,
      platform: body.platform,
      postUrl: body.postUrl || null,
    },
  });
  return NextResponse.json({ ok: true, id: post.id });
}
