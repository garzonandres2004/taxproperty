"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CopyButton from "./CopyButton";
import { dateShort } from "@/lib/format";

type Props = {
  vehicleId: string;
  vehicleUrl: string;
  marketplaceFields: { label: string; value: string }[];
  fullDescription: string;
  facebookPost: string;
  instagramCaption: string;
  posts: { id: string; platform: string; postedAt: string; postUrl: string | null }[];
};

const PLATFORM_LABELS: Record<string, string> = {
  MARKETPLACE: "Facebook Marketplace",
  FACEBOOK: "Página de Facebook",
  INSTAGRAM: "Instagram",
};

type Tab = "MARKETPLACE" | "FACEBOOK" | "INSTAGRAM";

export default function PublishCenter(props: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("MARKETPLACE");
  const [busy, setBusy] = useState(false);
  const [fbError, setFbError] = useState("");

  async function markPosted(platform: Tab) {
    setBusy(true);
    await fetch("/api/admin/social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicleId: props.vehicleId, platform }),
    });
    setBusy(false);
    router.refresh();
  }

  async function autoPostFacebook() {
    setBusy(true);
    setFbError("");
    const res = await fetch("/api/admin/social/facebook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicleId: props.vehicleId }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      router.refresh();
    } else {
      setFbError(data.error || "No se pudo publicar automáticamente.");
    }
  }

  const posted = (platform: string) => props.posts.filter((p) => p.platform === platform);

  const TabButton = ({ id, label }: { id: Tab; label: string }) => (
    <button
      onClick={() => setTab(id)}
      className={`rounded-t-lg px-4 py-2 text-sm font-bold ${
        tab === id ? "bg-white text-ink shadow-sm" : "text-neutral-500 hover:text-ink"
      }`}
    >
      {label}
      {posted(id).length > 0 && <span className="ml-1 text-green-600">✓</span>}
    </button>
  );

  return (
    <div>
      <div className="flex gap-1 rounded-t-xl bg-neutral-100 px-2 pt-2">
        <TabButton id="MARKETPLACE" label="🏪 Marketplace" />
        <TabButton id="FACEBOOK" label="👍 Facebook" />
        <TabButton id="INSTAGRAM" label="📸 Instagram" />
      </div>

      <div className="card rounded-t-none p-5">
        {tab === "MARKETPLACE" && (
          <div>
            <div className="mb-4 rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
              <p className="font-bold">Cómo publicar en Marketplace (menos de 2 minutos):</p>
              <ol className="mt-1 list-decimal space-y-0.5 pl-5">
                <li>Abre el formulario de Marketplace con el botón de abajo.</li>
                <li>Copia y pega cada campo — están en el mismo orden que el formulario.</li>
                <li>Sube las fotos desde tu teléfono o computadora.</li>
                <li>Al terminar, marca &quot;Ya lo publiqué&quot; para llevar el registro.</li>
              </ol>
              <p className="mt-2 text-xs text-blue-700">
                Facebook no permite publicar en Marketplace automáticamente desde otras
                aplicaciones, por eso esta plantilla te deja todo listo para copiar y pegar.
              </p>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <a
                href="https://www.facebook.com/marketplace/create/vehicle"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-sm"
              >
                🏪 Abrir formulario de Marketplace
              </a>
              <CopyButton text={props.fullDescription} label="Copiar descripción completa" />
            </div>

            <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
              {props.marketplaceFields.map((f) => (
                <div key={f.label} className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase text-neutral-400">{f.label}</p>
                    <p className="truncate text-sm font-semibold" title={f.value}>
                      {f.label === "Description" ? "Descripción completa (ver abajo)" : f.value}
                    </p>
                  </div>
                  <CopyButton text={f.value} small />
                </div>
              ))}
            </div>

            <div className="mt-4">
              <p className="label">Vista previa de la descripción</p>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-neutral-50 p-4 text-xs">
                {props.fullDescription}
              </pre>
            </div>

            <button onClick={() => markPosted("MARKETPLACE")} disabled={busy} className="btn-secondary mt-4 text-sm">
              ✅ Ya lo publiqué en Marketplace
            </button>
          </div>
        )}

        {tab === "FACEBOOK" && (
          <div>
            <p className="mb-3 text-sm text-neutral-600">
              Post listo para la página de Facebook de 88 Motors (incluye el link del carro
              en la página web).
            </p>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-neutral-50 p-4 text-xs">
              {props.facebookPost}
            </pre>
            <div className="mt-4 flex flex-wrap gap-2">
              <CopyButton text={props.facebookPost} label="Copiar post" />
              <a
                href="https://www.facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-sm"
              >
                👍 Abrir Facebook
              </a>
              <button onClick={autoPostFacebook} disabled={busy} className="btn-primary text-sm">
                ⚡ Publicar automáticamente
              </button>
              <button onClick={() => markPosted("FACEBOOK")} disabled={busy} className="btn-secondary text-sm">
                ✅ Ya lo publiqué
              </button>
            </div>
            {fbError && (
              <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{fbError}</p>
            )}
          </div>
        )}

        {tab === "INSTAGRAM" && (
          <div>
            <p className="mb-3 text-sm text-neutral-600">
              Caption listo con hashtags. Copia el texto, abre Instagram en tu teléfono,
              sube las fotos del carro y pega el caption.
            </p>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-neutral-50 p-4 text-xs">
              {props.instagramCaption}
            </pre>
            <div className="mt-4 flex flex-wrap gap-2">
              <CopyButton text={props.instagramCaption} label="Copiar caption" />
              <button onClick={() => markPosted("INSTAGRAM")} disabled={busy} className="btn-secondary text-sm">
                ✅ Ya lo publiqué
              </button>
            </div>
          </div>
        )}
      </div>

      {props.posts.length > 0 && (
        <div className="card mt-6 p-5">
          <h2 className="mb-3 font-black">Historial de publicaciones</h2>
          <ul className="space-y-2 text-sm">
            {props.posts.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span className="font-semibold">{PLATFORM_LABELS[p.platform] || p.platform}</span>
                <span className="text-neutral-400">— {dateShort(p.postedAt)}</span>
                {p.postUrl && (
                  <a href={p.postUrl} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                    Ver post
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
