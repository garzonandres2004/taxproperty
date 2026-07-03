import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { facebookPagePost } from "@/lib/social";

// OPTIONAL auto-posting to the 88 Motors Facebook Page via the Graph API.
// Needs FB_PAGE_ID and FB_PAGE_ACCESS_TOKEN (a Page token with
// pages_manage_posts). Marketplace listings cannot be created via API —
// that flow stays copy/paste from the Publish Center.
export async function POST(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pageId = process.env.FB_PAGE_ID;
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!pageId || !token) {
    return NextResponse.json(
      {
        error:
          "Facebook no está conectado. Configura FB_PAGE_ID y FB_PAGE_ACCESS_TOKEN en el archivo .env para publicar automáticamente. Mientras tanto usa el botón de copiar.",
      },
      { status: 501 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body?.vehicleId) {
    return NextResponse.json({ error: "vehicleId requerido" }, { status: 400 });
  }
  const vehicle = await prisma.vehicle.findUnique({ where: { id: body.vehicleId } });
  if (!vehicle) return NextResponse.json({ error: "Vehículo no encontrado" }, { status: 404 });

  const message = facebookPagePost(vehicle);
  const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, access_token: token }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json(
      { error: `Facebook rechazó la publicación: ${data?.error?.message || res.status}` },
      { status: 502 }
    );
  }

  const postUrl = data.id ? `https://www.facebook.com/${data.id}` : null;
  await prisma.socialPost.create({
    data: { vehicleId: vehicle.id, platform: "FACEBOOK", postUrl },
  });
  return NextResponse.json({ ok: true, postUrl });
}
