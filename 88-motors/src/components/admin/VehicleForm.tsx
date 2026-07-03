"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { VEHICLE_STATUSES, VEHICLE_STATUS_LABELS } from "@/lib/format";

export type VehicleFormValues = {
  id?: string;
  stockNumber?: string | null;
  vin?: string | null;
  year?: number;
  make?: string;
  model?: string;
  trim?: string | null;
  bodyStyle?: string | null;
  mileage?: number;
  price?: number;
  cost?: number | null;
  condition?: string;
  exteriorColor?: string | null;
  interiorColor?: string | null;
  transmission?: string | null;
  fuelType?: string | null;
  drivetrain?: string | null;
  engine?: string | null;
  titleStatus?: string;
  description?: string;
  features?: string;
  status?: string;
  featured?: boolean;
  soldPrice?: number | null;
  photos?: { url: string }[];
};

const CONDITIONS = ["Excellent", "Very Good", "Good", "Fair", "Needs Work"];
const BODY_STYLES = ["Sedan", "SUV", "Truck", "Coupe", "Hatchback", "Minivan", "Convertible", "Wagon", "Other"];
const TRANSMISSIONS = ["Automatic", "Manual", "CVT"];
const FUELS = ["Gasoline", "Diesel", "Hybrid", "Electric", "Flex"];
const DRIVETRAINS = ["FWD", "RWD", "AWD", "4WD"];
const TITLES = ["Clean", "Rebuilt", "Salvage"];

export default function VehicleForm({ vehicle }: { vehicle?: VehicleFormValues }) {
  const router = useRouter();
  const isEdit = Boolean(vehicle?.id);
  const [photos, setPhotos] = useState<string[]>(vehicle?.photos?.map((p) => p.url) || []);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError("");
    const fd = new FormData();
    for (const f of Array.from(files)) fd.append("files", f);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.urls?.length) {
      setPhotos((p) => [...p, ...data.urls]);
    } else {
      setError(data.error || "No se pudieron subir las fotos.");
    }
    setUploading(false);
  }

  function movePhoto(i: number, dir: -1 | 1) {
    setPhotos((p) => {
      const next = [...p];
      const j = i + dir;
      if (j < 0 || j >= next.length) return p;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const body: any = Object.fromEntries(fd.entries());
    body.featured = fd.get("featured") === "on";
    body.photos = photos;

    const res = await fetch(
      isEdit ? `/api/admin/vehicles/${vehicle!.id}` : "/api/admin/vehicles",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      router.push(isEdit ? "/admin/vehicles" : `/admin/vehicles/${data.id}/publish`);
      router.refresh();
    } else {
      setError(data.error || "Error al guardar.");
      setSaving(false);
    }
  }

  async function remove() {
    if (!isEdit) return;
    if (!confirm("¿Seguro que quieres borrar este carro? Esta acción no se puede deshacer.")) return;
    const res = await fetch(`/api/admin/vehicles/${vehicle!.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin/vehicles");
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="card p-5">
        <h2 className="mb-4 font-black">Información básica</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Año *</label>
            <input name="year" type="number" required min={1950} max={2030} defaultValue={vehicle?.year} className="input" placeholder="2018" />
          </div>
          <div>
            <label className="label">Marca *</label>
            <input name="make" required defaultValue={vehicle?.make} className="input" placeholder="Toyota" />
          </div>
          <div>
            <label className="label">Modelo *</label>
            <input name="model" required defaultValue={vehicle?.model} className="input" placeholder="Camry" />
          </div>
          <div>
            <label className="label">Versión (trim)</label>
            <input name="trim" defaultValue={vehicle?.trim || ""} className="input" placeholder="SE, LT, Limited..." />
          </div>
          <div>
            <label className="label">Tipo de carrocería</label>
            <select name="bodyStyle" defaultValue={vehicle?.bodyStyle || ""} className="input">
              <option value="">—</option>
              {BODY_STYLES.map((b) => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Millaje *</label>
            <input name="mileage" type="number" required min={0} defaultValue={vehicle?.mileage} className="input" placeholder="85000" />
          </div>
          <div>
            <label className="label">Precio de venta ($) *</label>
            <input name="price" type="number" required min={0} step="1" defaultValue={vehicle?.price} className="input" placeholder="12500" />
          </div>
          <div>
            <label className="label">Costo (privado, para tu ganancia)</label>
            <input name="cost" type="number" min={0} step="1" defaultValue={vehicle?.cost ?? ""} className="input" placeholder="9000" />
          </div>
          <div>
            <label className="label">Estado</label>
            <select name="status" defaultValue={vehicle?.status || "AVAILABLE"} className="input">
              {VEHICLE_STATUSES.map((s) => (
                <option key={s} value={s}>{VEHICLE_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
          {vehicle?.status === "SOLD" || isEdit ? (
            <div>
              <label className="label">Precio final de venta (si ya se vendió)</label>
              <input name="soldPrice" type="number" min={0} step="1" defaultValue={vehicle?.soldPrice ?? ""} className="input" placeholder="12000" />
            </div>
          ) : null}
          <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold">
            <input name="featured" type="checkbox" defaultChecked={vehicle?.featured} className="h-4 w-4" />
            Destacar en la página principal
          </label>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 font-black">Detalles del vehículo</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Condición</label>
            <select name="condition" defaultValue={vehicle?.condition || "Good"} className="input">
              {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Título</label>
            <select name="titleStatus" defaultValue={vehicle?.titleStatus || "Clean"} className="input">
              {TITLES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Transmisión</label>
            <select name="transmission" defaultValue={vehicle?.transmission || ""} className="input">
              <option value="">—</option>
              {TRANSMISSIONS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Combustible</label>
            <select name="fuelType" defaultValue={vehicle?.fuelType || ""} className="input">
              <option value="">—</option>
              {FUELS.map((f) => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Tracción</label>
            <select name="drivetrain" defaultValue={vehicle?.drivetrain || ""} className="input">
              <option value="">—</option>
              {DRIVETRAINS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Motor</label>
            <input name="engine" defaultValue={vehicle?.engine || ""} className="input" placeholder="2.5L 4-Cyl" />
          </div>
          <div>
            <label className="label">Color exterior</label>
            <input name="exteriorColor" defaultValue={vehicle?.exteriorColor || ""} className="input" placeholder="Silver" />
          </div>
          <div>
            <label className="label">Color interior</label>
            <input name="interiorColor" defaultValue={vehicle?.interiorColor || ""} className="input" placeholder="Black" />
          </div>
          <div>
            <label className="label">VIN</label>
            <input name="vin" defaultValue={vehicle?.vin || ""} className="input" placeholder="1HGCM82633A..." />
          </div>
          <div>
            <label className="label">Número de stock</label>
            <input name="stockNumber" defaultValue={vehicle?.stockNumber || ""} className="input" placeholder="88-0001" />
          </div>
        </div>
        <div className="mt-4">
          <label className="label">Equipamiento (separado por comas)</label>
          <input
            name="features"
            defaultValue={vehicle?.features || ""}
            className="input"
            placeholder="Backup camera, Bluetooth, Sunroof, Leather seats"
          />
        </div>
        <div className="mt-4">
          <label className="label">Descripción (se usa en la web y en las publicaciones)</label>
          <textarea
            name="description"
            rows={5}
            defaultValue={vehicle?.description || ""}
            className="input"
            placeholder="Runs and drives great. One owner, no accidents..."
          />
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-1 font-black">Fotos</h2>
        <p className="mb-4 text-sm text-neutral-500">
          La primera foto es la principal. Usa las flechas para reordenar.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="btn-secondary cursor-pointer text-sm">
            {uploading ? "Subiendo..." : "📷 Subir fotos"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={(e) => uploadFiles(e.target.files)}
            />
          </label>
          <div className="flex flex-1 gap-2">
            <input
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              className="input"
              placeholder="...o pega el link de una foto (https://...)"
            />
            <button
              type="button"
              className="btn-secondary text-sm"
              onClick={() => {
                if (photoUrl.trim()) {
                  setPhotos((p) => [...p, photoUrl.trim()]);
                  setPhotoUrl("");
                }
              }}
            >
              Agregar
            </button>
          </div>
        </div>
        {photos.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {photos.map((url, i) => (
              <div key={url + i} className="relative overflow-hidden rounded-lg border border-neutral-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="aspect-[4/3] w-full object-cover" />
                {i === 0 && (
                  <span className="absolute left-1 top-1 rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
                    PRINCIPAL
                  </span>
                )}
                <div className="flex justify-between bg-neutral-50 px-1 py-1 text-sm">
                  <button type="button" onClick={() => movePhoto(i, -1)} className="px-1 hover:text-brand">←</button>
                  <button
                    type="button"
                    onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                    className="px-1 text-red-600"
                  >
                    🗑
                  </button>
                  <button type="button" onClick={() => movePhoto(i, 1)} className="px-1 hover:text-brand">→</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {error && <p className="font-semibold text-red-600">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button disabled={saving} className="btn-primary">
          {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Guardar y publicar →"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">
          Cancelar
        </button>
        {isEdit && (
          <button
            type="button"
            onClick={remove}
            className="ml-auto text-sm font-semibold text-red-600 hover:underline"
          >
            Borrar carro
          </button>
        )}
      </div>
    </form>
  );
}
