"use client";

import { useState } from "react";

export default function CopyButton({
  text,
  label = "Copiar",
  small,
}: {
  text: string;
  label?: string;
  small?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for older browsers / non-HTTPS
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`shrink-0 rounded-lg font-semibold transition ${
        small ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"
      } ${
        copied
          ? "bg-green-600 text-white"
          : "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
      }`}
    >
      {copied ? "✓ Copiado" : `📋 ${label}`}
    </button>
  );
}
