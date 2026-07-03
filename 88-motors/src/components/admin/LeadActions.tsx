"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LEAD_STATUSES, LEAD_STATUS_LABELS } from "@/lib/format";

export default function LeadActions({
  leadId,
  status,
}: {
  leadId: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function update(body: Record<string, unknown>) {
    setBusy(true);
    await fetch(`/api/admin/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Estado del cliente</label>
        <div className="flex flex-wrap gap-2">
          {LEAD_STATUSES.map((s) => (
            <button
              key={s}
              disabled={busy}
              onClick={() => update({ status: s })}
              className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
                status === s
                  ? "bg-ink text-white"
                  : "border border-neutral-300 bg-white hover:bg-neutral-100"
              }`}
            >
              {LEAD_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Agregar nota</label>
        <div className="flex gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input"
            placeholder="Ej: Le llamé, viene el sábado a ver el carro..."
          />
          <button
            disabled={busy || !note.trim()}
            onClick={async () => {
              await update({ note });
              setNote("");
            }}
            className="btn-primary text-sm"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
