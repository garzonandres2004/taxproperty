import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { vehicleTitle, money } from "@/lib/format";
import {
  marketplaceFields,
  fullDescription,
  facebookPagePost,
  instagramCaption,
  vehicleUrl,
} from "@/lib/social";
import PublishCenter from "@/components/admin/PublishCenter";
import CopyButton from "@/components/admin/CopyButton";

export const dynamic = "force-dynamic";

export default async function PublishPage({ params }: { params: { id: string } }) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: params.id },
    include: {
      photos: { orderBy: { sortOrder: "asc" } },
      socialPosts: { orderBy: { postedAt: "desc" } },
    },
  });
  if (!vehicle) notFound();

  const url = vehicleUrl(vehicle);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">📣 Centro de publicación</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {vehicleTitle(vehicle)} · {money(vehicle.price)}
          </p>
        </div>
        <Link href={`/admin/vehicles/${vehicle.id}`} className="btn-secondary text-sm">
          ✏️ Editar carro
        </Link>
      </div>

      <div className="card mb-6 flex flex-wrap items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase text-neutral-400">
            🌐 Ya está publicado en tu página web
          </p>
          <a href={url} target="_blank" className="truncate text-sm font-semibold text-brand hover:underline">
            {url}
          </a>
        </div>
        <CopyButton text={url} label="Copiar link" small />
      </div>

      {vehicle.photos.length === 0 && (
        <p className="mb-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
          ⚠️ Este carro no tiene fotos. Las publicaciones con fotos venden mucho más —{" "}
          <Link href={`/admin/vehicles/${vehicle.id}`} className="font-bold underline">
            agrega fotos aquí
          </Link>
          .
        </p>
      )}

      <PublishCenter
        vehicleId={vehicle.id}
        vehicleUrl={url}
        marketplaceFields={marketplaceFields(vehicle)}
        fullDescription={fullDescription(vehicle)}
        facebookPost={facebookPagePost(vehicle)}
        instagramCaption={instagramCaption(vehicle)}
        posts={vehicle.socialPosts.map((p) => ({
          id: p.id,
          platform: p.platform,
          postedAt: p.postedAt.toISOString(),
          postUrl: p.postUrl,
        }))}
      />
    </div>
  );
}
