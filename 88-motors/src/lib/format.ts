export function money(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function miles(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${n.toLocaleString("en-US")} mi`;
}

export function vehicleTitle(v: {
  year: number;
  make: string;
  model: string;
  trim?: string | null;
}): string {
  return [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ");
}

export function dateShort(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "NEGOTIATING",
  "APPOINTMENT",
  "SOLD",
  "LOST",
] as const;

export const LEAD_STATUS_LABELS: Record<string, string> = {
  NEW: "Nuevo",
  CONTACTED: "Contactado",
  NEGOTIATING: "Negociando",
  APPOINTMENT: "Cita agendada",
  SOLD: "Vendido",
  LOST: "Perdido",
};

export const LEAD_SOURCE_LABELS: Record<string, string> = {
  WEBSITE: "Página web",
  FACEBOOK: "Facebook",
  MARKETPLACE: "Marketplace",
  INSTAGRAM: "Instagram",
  PHONE: "Teléfono",
  WALK_IN: "Visita",
};

export const VEHICLE_STATUSES = ["DRAFT", "AVAILABLE", "PENDING", "SOLD"] as const;

export const VEHICLE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  AVAILABLE: "Disponible",
  PENDING: "Apartado",
  SOLD: "Vendido",
};
