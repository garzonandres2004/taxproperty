import Link from 'next/link';
import {
  ShieldCheck,
  Layers,
  FileCheck,
  ArrowRight,
  Building2,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 lg:px-20 py-6 border-b border-slate-100 sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-2">
          <Building2 size={28} className="text-slate-900" />
          <span className="text-2xl font-black tracking-tighter text-slate-900 uppercase">TaxProperty</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
          <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
          <a href="#data" className="hover:text-slate-900 transition-colors">Data Coverage</a>
          <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
        </div>
        <Link href="/dashboard" className="btn btn-primary px-6">
          View Dashboard
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="px-6 lg:px-20 pt-20 pb-32 flex flex-col items-center text-center max-w-5xl mx-auto">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-widest mb-8"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Next Gen Tax Sale Intelligence
        </div>

        <h1
          className="text-5xl lg:text-8xl font-black tracking-tighter text-slate-900 leading-[0.9] mb-8"
        >
          Tax Sale Intelligence for <span className="text-emerald-500 italic">Serious Investors</span>
        </h1>

        <p
          className="text-xl text-slate-500 max-w-2xl mb-12 leading-relaxed"
        >
          We analyze every property in the county tax sale, scoring risk and opportunity
          so you can bid with confidence. Real-time zoning, market value, and payoff data.
        </p>

        <div
          className="flex flex-col sm:flex-row gap-4"
        >
          <Link href="/dashboard" className="btn btn-primary text-lg px-8 py-4 gap-2">
            View Live Dashboard <ArrowRight size={20} />
          </Link>
          <button className="btn btn-secondary text-lg px-8 py-4">
            Request Demo
          </button>
        </div>

        {/* Live Stats */}
        <div
          className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl border-t border-slate-100 pt-12"
        >
          <div className="flex flex-col items-center">
            <span className="text-3xl font-black text-slate-900 leading-tight">127</span>
            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Properties Analyzed</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-3xl font-black text-slate-900 leading-tight tracking-tight">Utah County</span>
            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Active Auction</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-3xl font-black text-slate-900 leading-tight tracking-tight">May 21, 2026</span>
            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sale Date</span>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section id="features" className="bg-slate-50 py-32 px-6 lg:px-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Feature 1 */}
            <div className="flex flex-col gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white shadow-xl shadow-slate-200 flex items-center justify-center text-emerald-500 mb-2">
                <ShieldCheck size={28} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Risk Scoring Engine</h3>
              <p className="text-slate-500 leading-relaxed">
                Automated assessment of liens, environmental factors, and title history.
                Know exactly what you&apos;re buying before the hammer drops.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white shadow-xl shadow-slate-200 flex items-center justify-center text-blue-500 mb-2">
                <Layers size={28} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Zoning Intelligence</h3>
              <p className="text-slate-500 leading-relaxed">
                Instant access to building rules, lot coverage, and use cases.
                Identify buildable lots and development potential in seconds.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white shadow-xl shadow-slate-200 flex items-center justify-center text-emerald-500 mb-2">
                <FileCheck size={28} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Investor Reports</h3>
              <p className="text-slate-500 leading-relaxed">
                Generate professional multi-page memos for your investment committee or funds.
                Fully printable with high-res property data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="mt-auto py-12 px-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-2">
          <Building2 size={24} className="text-slate-400" />
          <span className="text-lg font-black tracking-tighter text-slate-400 uppercase">TaxProperty</span>
        </div>
        <p className="text-slate-400 text-sm">© 2026 TaxProperty Intelligence. For institutional investors.</p>
        <div className="flex gap-6 text-slate-400 text-sm font-bold uppercase tracking-widest">
          <a href="#" className="hover:text-slate-900 transition-colors">Privacy</a>
          <a href="#" className="hover:text-slate-900 transition-colors">Terms</a>
        </div>
      </footer>
    </div>
  );
}
