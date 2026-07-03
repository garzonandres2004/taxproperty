// Generates ready-to-post content for every channel from one vehicle record.
// Facebook Marketplace has no public posting API, so we mirror its exact
// vehicle-listing form fields so the owner can copy/paste in seconds.

import { DEALER } from "./config";
import { money, vehicleTitle } from "./format";

export type VehicleForSocial = {
  id: string;
  year: number;
  make: string;
  model: string;
  trim?: string | null;
  bodyStyle?: string | null;
  mileage: number;
  price: number;
  condition: string;
  exteriorColor?: string | null;
  interiorColor?: string | null;
  transmission?: string | null;
  fuelType?: string | null;
  drivetrain?: string | null;
  engine?: string | null;
  titleStatus: string;
  description: string;
  features: string;
};

export function featureList(v: VehicleForSocial): string[] {
  return v.features
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);
}

export function vehicleUrl(v: VehicleForSocial): string {
  return `${DEALER.siteUrl}/inventory/${v.id}`;
}

/** Long-form description used on Marketplace and the Facebook page post. */
export function fullDescription(v: VehicleForSocial): string {
  const lines: string[] = [];
  lines.push(`${vehicleTitle(v)} — ${money(v.price)}`);
  lines.push("");
  const specs: [string, string | null | undefined][] = [
    ["Mileage", `${v.mileage.toLocaleString("en-US")} miles`],
    ["Condition", v.condition],
    ["Title", v.titleStatus],
    ["Transmission", v.transmission],
    ["Fuel", v.fuelType],
    ["Drivetrain", v.drivetrain],
    ["Engine", v.engine],
    ["Exterior", v.exteriorColor],
    ["Interior", v.interiorColor],
  ];
  for (const [label, value] of specs) {
    if (value) lines.push(`• ${label}: ${value}`);
  }
  const feats = featureList(v);
  if (feats.length) {
    lines.push("");
    lines.push("Features:");
    for (const f of feats) lines.push(`✔ ${f}`);
  }
  if (v.description.trim()) {
    lines.push("");
    lines.push(v.description.trim());
  }
  lines.push("");
  lines.push(`📍 ${DEALER.name} — ${DEALER.address}`);
  lines.push(`📞 Call or text: ${DEALER.phone}`);
  lines.push(`🌐 More cars: ${DEALER.siteUrl}`);
  return lines.join("\n");
}

/**
 * The exact fields Facebook Marketplace asks for when creating a
 * "Vehicle for sale" listing, in the same order as the form.
 */
export function marketplaceFields(
  v: VehicleForSocial
): { label: string; value: string }[] {
  return [
    { label: "Vehicle type", value: "Car/Truck" },
    { label: "Year", value: String(v.year) },
    { label: "Make", value: v.make },
    { label: "Model", value: [v.model, v.trim].filter(Boolean).join(" ") },
    { label: "Mileage", value: String(v.mileage) },
    { label: "Price", value: String(Math.round(v.price)) },
    { label: "Body style", value: v.bodyStyle || "Other" },
    { label: "Exterior color", value: v.exteriorColor || "—" },
    { label: "Interior color", value: v.interiorColor || "—" },
    { label: "Vehicle condition", value: v.condition },
    { label: "Fuel type", value: v.fuelType || "Gasoline" },
    { label: "Transmission", value: v.transmission || "Automatic" },
    { label: "Clean title", value: v.titleStatus === "Clean" ? "Yes" : "No" },
    { label: "Description", value: fullDescription(v) },
  ];
}

/** Instagram caption with hashtags. Photos are posted from the phone. */
export function instagramCaption(v: VehicleForSocial): string {
  const feats = featureList(v).slice(0, 4);
  const lines: string[] = [];
  lines.push(`🚗 ${vehicleTitle(v)}`);
  lines.push(`💰 ${money(v.price)} | 🛣 ${v.mileage.toLocaleString("en-US")} miles`);
  if (feats.length) lines.push(`✨ ${feats.join(" • ")}`);
  lines.push("");
  lines.push(`📞 Call or text ${DEALER.phone}`);
  lines.push(`📍 ${DEALER.address}`);
  lines.push(`🔗 Link in bio for full inventory`);
  lines.push("");
  const tags = [
    "#88Motors",
    "#UsedCars",
    "#CarsForSale",
    `#${v.make.replace(/\s/g, "")}`,
    `#${v.make.replace(/\s/g, "")}${v.model.replace(/\s/g, "")}`,
    "#CarDealer",
    "#AutoSales",
    "#CarLovers",
  ];
  lines.push(tags.join(" "));
  return lines.join("\n");
}

/** Post text for the 88 Motors Facebook page (includes website link). */
export function facebookPagePost(v: VehicleForSocial): string {
  const lines: string[] = [];
  lines.push(`🔥 JUST IN: ${vehicleTitle(v)} 🔥`);
  lines.push("");
  lines.push(fullDescription(v));
  lines.push("");
  lines.push(`👉 See it here: ${vehicleUrl(v)}`);
  return lines.join("\n");
}
