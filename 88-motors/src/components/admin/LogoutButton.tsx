"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch("/api/admin/login", { method: "DELETE" });
        router.push("/admin/login");
        router.refresh();
      }}
      className="w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-400 hover:bg-neutral-800 hover:text-white"
    >
      ← Cerrar sesión
    </button>
  );
}
