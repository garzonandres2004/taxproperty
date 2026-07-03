"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LEAD_SOURCE_LABELS } from "@/lib/format";

export default function NewLeadForm({
  vehicles,
}: {
  vehicles: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        phone: fd.get("phone"),
        email: fd.get("email"),
        source: fd.get("source"),
        vehicleId: fd.get("vehicleId") || null,
        message: fd.get("message"),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      router.push(`/admin/leads/${data.id}`);
      router.refresh();
    } else {
      setError(data.error || "Error al guardar.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="card max-w-xl space-y-4 p-5">
      <div>
        <label className="label">Nombre *</label>
        <input name="name" required className="input" placeholder="Juan Pérez" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Teléfono</label>
          <input name="phone" className="input" placeholder="(555) 123-4567" />
        </div>
        <div>
          <label className="label">Email</label>
          <input name="email" type="email" className="input" placeholder="cliente@email.com" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">¿Cómo llegó?</label>
          <select name="source" defaultValue="MARKETPLACE" className="input">
            {Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Carro de interés</label>
          <select name="vehicleId" defaultValue="" className="input">
            <option value="">— Ninguno / general —</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Nota / mensaje</label>
        <textarea name="message" rows={3} className="input" placeholder="Preguntó por el precio, quiere verlo el sábado..." />
      </div>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <button disabled={saving} className="btn-primary">
        {saving ? "Guardando..." : "Registrar cliente"}
      </button>
    </form>
  );
}
