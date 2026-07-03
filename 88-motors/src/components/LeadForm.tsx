"use client";

import { useState } from "react";

export default function LeadForm({
  vehicleId,
  defaultMessage,
}: {
  vehicleId?: string;
  defaultMessage?: string;
}) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setState("sending");
    setError("");
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        phone: fd.get("phone"),
        email: fd.get("email"),
        message: fd.get("message"),
        vehicleId,
      }),
    });
    if (res.ok) {
      setState("sent");
      form.reset();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong. Please call us instead.");
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div className="rounded-lg bg-green-50 p-6 text-center">
        <p className="text-2xl">✅</p>
        <p className="mt-2 font-bold text-green-800">Message sent!</p>
        <p className="text-sm text-green-700">
          We&apos;ll get back to you as soon as possible.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="label">Name *</label>
        <input name="name" required className="input" placeholder="Your name" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Phone</label>
          <input name="phone" className="input" placeholder="(555) 123-4567" />
        </div>
        <div>
          <label className="label">Email</label>
          <input name="email" type="email" className="input" placeholder="you@email.com" />
        </div>
      </div>
      <div>
        <label className="label">Message</label>
        <textarea
          name="message"
          rows={3}
          className="input"
          defaultValue={defaultMessage}
          placeholder="I'm interested in this vehicle..."
        />
      </div>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <button disabled={state === "sending"} className="btn-primary w-full">
        {state === "sending" ? "Sending..." : "Send message"}
      </button>
      <p className="text-center text-xs text-neutral-400">
        Provide a phone or email so we can reach you.
      </p>
    </form>
  );
}
