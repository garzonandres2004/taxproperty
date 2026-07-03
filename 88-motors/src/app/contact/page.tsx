import { DEALER } from "@/lib/config";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import LeadForm from "@/components/LeadForm";

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-3xl font-black uppercase">Contact us</h1>
        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          <div className="card p-6">
            <h2 className="font-bold uppercase text-neutral-500">Send a message</h2>
            <div className="mt-4">
              <LeadForm />
            </div>
          </div>
          <div className="space-y-6">
            <div className="card p-6">
              <h2 className="font-bold uppercase text-neutral-500">Call or text</h2>
              <a
                href={`tel:${DEALER.phone.replace(/[^\d+]/g, "")}`}
                className="mt-2 block text-2xl font-black text-brand"
              >
                {DEALER.phone}
              </a>
            </div>
            <div className="card p-6">
              <h2 className="font-bold uppercase text-neutral-500">Visit the lot</h2>
              <p className="mt-2 font-semibold">{DEALER.address}</p>
              <p className="mt-1 text-sm text-neutral-500">
                Mon–Sat: 9am – 7pm · Sun: Closed
              </p>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
