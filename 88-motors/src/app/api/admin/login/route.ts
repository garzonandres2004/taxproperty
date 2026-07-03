import { NextRequest, NextResponse } from "next/server";
import { checkPassword, setAdminCookie, clearAdminCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.password || !checkPassword(String(body.password))) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }
  setAdminCookie();
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  clearAdminCookie();
  return NextResponse.json({ ok: true });
}
