"use client";

import { useState } from "react";

export default function PhotoGallery({
  photos,
  alt,
}: {
  photos: { url: string }[];
  alt: string;
}) {
  const [active, setActive] = useState(0);

  if (photos.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-neutral-200 text-6xl">
        🚗
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-hidden rounded-xl bg-neutral-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photos[active].url}
          alt={alt}
          className="aspect-[4/3] w-full object-cover"
        />
      </div>
      {photos.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {photos.map((p, i) => (
            <button
              key={p.url + i}
              onClick={() => setActive(i)}
              className={`overflow-hidden rounded-lg border-2 ${
                i === active ? "border-brand" : "border-transparent opacity-70"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="aspect-[4/3] w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
