"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: fd.get("password") }),
    });
    if (res.ok) {
      router.push("/admin");
      router.refresh();
    } else {
      setError("Contraseña incorrecta");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-4">
      <form onSubmit={submit} className="card w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-xl font-black italic text-white">
            88
          </span>
          <h1 className="mt-3 text-xl font-black uppercase">Panel de 88 Motors</h1>
          <p className="text-sm text-neutral-500">Acceso solo para el dealer</p>
        </div>
        <label className="label">Contraseña</label>
        <input
          name="password"
          type="password"
          required
          autoFocus
          className="input"
          placeholder="••••••••"
        />
        {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
        <button disabled={loading} className="btn-primary mt-4 w-full">
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
