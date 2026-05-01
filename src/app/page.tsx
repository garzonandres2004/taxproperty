import Link from 'next/link';
import {
  ShieldCheck,
  Layers,
  FileCheck,
  ArrowRight,
  Building2,
  Calculator,
  ClipboardCheck,
  Map,
  Calendar,
  Search,
  CheckCircle2,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-900">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 lg:px-20 py-6 border-b border-slate-800 sticky top-0 bg-slate-900/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-2">
          <div className="bg-blue-500 p-1.5 rounded-lg">
            <Building2 size={24} className="text-white" />
          </div>
          <span className="text-2xl font-black tracking-tighter text-white uppercase">TaxProperty</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#v3" className="hover:text-white transition-colors">V3 Highlights</a>
          <a href="#data" className="hover:text-white transition-colors">Data Coverage</a>
        </div>
        <Link href="/dashboard" className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors">
          View Dashboard
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="px-6 lg:px-20 pt-20 pb-32 flex flex-col items-center text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          V3 Now Available — Title Research Tools + Max Bid Calculator
        </div>

        <h1 className="text-5xl lg:text-7xl font-black tracking-tighter text-white leading-[0.95] mb-8">
          Tax Sale Intelligence for <span className="text-blue-400 italic">Serious Investors</span>
        </h1>

        <p className="text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed">
          Stop researching. Start bidding. We analyze every property in the tax sale,
          scoring risk and opportunity so you can invest with confidence.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-lg transition-colors">
            Analyze Properties <ArrowRight size={20} />
          </Link>
          <button className="inline-flex items-center justify-center px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg text-lg transition-colors border border-slate-700">
            View Sample Report
          </button>
        </div>

        {/* Live Stats */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-4 gap-8 w-full max-w-4xl border-t border-slate-800 pt-12">
          <div className="flex flex-col items-center">
            <span className="text-3xl font-black text-white leading-tight">127</span>
            <span className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Properties Scored</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-3xl font-black text-white leading-tight tracking-tight">Utah County</span>
            <span className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Active Sale</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-3xl font-black text-white leading-tight tracking-tight">May 21</span>
            <span className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">2026 Sale Date</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-3xl font-black text-blue-400 leading-tight">8-Step</span>
            <span className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Due Diligence</span>
          </div>
        </div>
      </section>

      {/* V3 Feature Highlights */}
      <section id="v3" className="bg-slate-800/50 border-y border-slate-800 py-24 px-6 lg:px-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-4">
              <CheckCircle2 size={14} />
              V3 Features Now Live
            </span>
            <h2 className="text-4xl font-black text-white tracking-tight mb-4">
              New Tools for Professional Investors
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Built from Dustin Hahn's methodology — the exact workflow used by professional tax deed investors.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Title Research Checklist */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 hover:border-blue-500/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-6">
                <ClipboardCheck size={28} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Title Research Checklist</h3>
              <p className="text-slate-400 leading-relaxed mb-6">
                8-step due diligence workflow based on Dustin Hahn's methodology. Track progress from drive-by inspection through max bid calculation.
              </p>
              <ul className="space-y-2 text-sm text-slate-500">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  Drive-by verification with Street View
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  Tax sanity checks (payoff ratios)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  Municipal lien risk assessment
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  Chain of title verification
                </li>
              </ul>
            </div>

            {/* Max Bid Calculator */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 hover:border-emerald-500/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-6">
                <Calculator size={28} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Max Bid Calculator</h3>
              <p className="text-slate-400 leading-relaxed mb-6">
                Dustin Hahn's proven formula: (ARV × 80%) − Costs − Profit. Automatically calculates maximum bid with real-time deal viability indicators.
              </p>
              <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm text-slate-400">
                <div className="text-emerald-400">Max Bid = Quick Sale − Costs − Profit</div>
                <div className="mt-2 text-slate-500">Where:</div>
                <div className="text-slate-400">Quick Sale = ARV × 80%</div>
                <div className="text-slate-400">Costs = Liens + Quiet Title (~$3,500)</div>
              </div>
            </div>

            {/* Interactive US Map */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 hover:border-purple-500/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-6">
                <Map size={28} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Interactive US Map</h3>
              <p className="text-slate-400 leading-relaxed mb-6">
                Visualize tax sale opportunities across all 50 states. Click any state to see auction types, sale dates, and available property counts.
              </p>
              <ul className="space-y-2 text-sm text-slate-500">
                <li className="flex items-center gap-2">
                  <Map size={14} className="text-purple-400" />
                  Tax lien vs. tax deed by state
                </li>
                <li className="flex items-center gap-2">
                  <Calendar size={14} className="text-purple-400" />
                  Upcoming auction calendar
                </li>
                <li className="flex items-center gap-2">
                  <TrendingUp size={14} className="text-purple-400" />
                  Sale frequency heatmap
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section id="features" className="py-24 px-6 lg:px-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white tracking-tight mb-4">
              Complete Investment Intelligence
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Every tool you need to evaluate tax sale properties — from scoring to due diligence to professional reports.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 mb-4">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Risk Scoring Engine</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Automated assessment of liens, environmental factors, and title history. Micro-parcel detection and entity ownership flags.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4">
                <Layers size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Zoning Intelligence</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                25 real Utah County zoning codes plus city-specific guidance. Buildability scores, setbacks, and use case analysis.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 mb-4">
                <Search size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Assemblage Detection</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Identify adjacent parcels for micro-parcel opportunities. Combined lot analysis for properties under 2,000 sq ft.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 mb-4">
                <FileCheck size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Investor Reports</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Generate professional multi-page memos for investment committees. Portfolio overviews with BID property summaries.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400 mb-4">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Redemption Monitoring</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Automated status checking against Utah County Land Records. Get alerts when properties are redeemed before sale.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-4">
                <TrendingUp size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Street View Integration</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Visual property assessment with Google Street View and aerial imagery. 93.7% coverage of Utah County properties.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Data Coverage */}
      <section id="data" className="bg-slate-800/50 border-y border-slate-800 py-24 px-6 lg:px-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-black text-white tracking-tight mb-6">
                Utah County May 2026 Sale
              </h2>
              <p className="text-lg text-slate-400 mb-8 leading-relaxed">
                Complete analysis of all 127 properties in the upcoming tax sale. Real GIS data,
                Street View imagery, and professional scoring for every parcel.
              </p>

              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-slate-700">
                  <span className="text-slate-400">Total Properties Analyzed</span>
                  <span className="text-white font-bold">127</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-700">
                  <span className="text-slate-400">Street View Coverage</span>
                  <span className="text-emerald-400 font-bold">119 (93.7%)</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-700">
                  <span className="text-slate-400">Unincorporated (Real Zoning)</span>
                  <span className="text-white font-bold">25</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-700">
                  <span className="text-slate-400">City Properties (Guidance)</span>
                  <span className="text-white font-bold">102</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-700">
                  <span className="text-slate-400">BID Recommendations</span>
                  <span className="text-emerald-400 font-bold">~20-30</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-slate-400">Sale Date</span>
                  <span className="text-blue-400 font-bold">May 21, 2026</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-white mb-6">Scoring Breakdown</h3>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-emerald-400 font-semibold">BID (70+)</span>
                    <span className="text-slate-400 text-sm">Strong candidates</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[25%] rounded-full"></div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-amber-400 font-semibold">RESEARCH (55-69)</span>
                    <span className="text-slate-400 text-sm">Need verification</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 w-[35%] rounded-full"></div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-rose-400 font-semibold">AVOID (&lt;55)</span>
                    <span className="text-slate-400 text-sm">Disqualifying issues</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 w-[40%] rounded-full"></div>
                  </div>
                </div>
              </div>

              <div className="mt-8 p-4 bg-slate-900 rounded-lg border border-slate-700">
                <h4 className="text-sm font-bold text-slate-300 mb-3">Formula</h4>
                <p className="text-sm text-slate-500 font-mono">
                  Final Score = Opportunity − Risk − Penalties
                </p>
                <p className="text-xs text-slate-600 mt-2">
                  Opportunity: equity spread, buildability, location • Risk: access, title, marketability • Penalties: micro-parcel (-40), entity-owned (-15)
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 lg:px-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-black text-white tracking-tight mb-6">
            Ready to bid smarter?
          </h2>
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
            Join professional investors who use TaxProperty to find opportunities
            and avoid costly mistakes in Utah County tax sales.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-lg transition-colors">
              Get Started <ArrowRight size={20} />
            </Link>
            <Link href="/properties" className="inline-flex items-center justify-center px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg text-lg transition-colors border border-slate-700">
              Browse Properties
            </Link>
          </div>

          <p className="text-sm text-slate-600 mt-8">
            Free during beta. No credit card required.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-12 px-6 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-2">
          <div className="bg-slate-700 p-1 rounded">
            <Building2 size={20} className="text-slate-400" />
          </div>
          <span className="text-lg font-black tracking-tighter text-slate-400 uppercase">TaxProperty</span>
        </div>
        <p className="text-slate-500 text-sm">© 2026 TaxProperty Intelligence LLC. For institutional investors.</p>
        <div className="flex gap-6 text-slate-500 text-sm font-semibold">
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
          <a href="#" className="hover:text-white transition-colors">Terms</a>
          <a href="#" className="hover:text-white transition-colors">Support</a>
        </div>
      </footer>
    </div>
  );
}
