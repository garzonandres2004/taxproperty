import { createHash } from "crypto";
import { cookies } from "next/headers";

const COOKIE = "m88_admin";

function adminPassword(): string {
  return process.env.ADMIN_PASSWORD || "88motors";
}

export function sessionToken(): string {
  return createHash("sha256")
    .update(`88motors-session:${adminPassword()}`)
    .digest("hex");
}

export function checkPassword(password: string): boolean {
  return password === adminPassword();
}

export function isAdmin(): boolean {
  return cookies().get(COOKIE)?.value === sessionToken();
}

export function setAdminCookie() {
  cookies().set(COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearAdminCookie() {
  cookies().delete(COOKIE);
}
