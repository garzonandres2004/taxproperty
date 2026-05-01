import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Building2, Calendar, Percent, Clock, MapPin, ExternalLink } from 'lucide-react';
import { stateData, SALE_TYPE_COLORS } from '@/lib/state-data';

interface StatePageProps {
  params: Promise<{
    code: string;
  }>;
}

export async function generateStaticParams() {
  return stateData.map((state) => ({
    code: state.code.toLowerCase(),
  }));
}

export async function generateMetadata({ params }: StatePageProps) {
  const { code } = await params;
  const state = stateData.find(s => s.code.toLowerCase() === code.toLowerCase());

  if (!state) {
    return { title: 'State Not Found' };
  }

  return {
    title: `${state.name} Tax Sale Guide | TaxProperty`,
    description: `Learn about ${state.name}'s tax sale process: ${SALE_TYPE_COLORS[state.sale_type].label}`,
  };
}

export default async function StateDetailPage({ params }: StatePageProps) {
  const { code } = await params;
  const state = stateData.find(s => s.code.toLowerCase() === code.toLowerCase());

  if (!state) {
    notFound();
  }

  const saleType = SALE_TYPE_COLORS[state.sale_type];

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Breadcrumb */}
      <div className="px-6 lg:px-20 py-4 border-b border-slate-800">
        <Link
          href="/states"
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
          <span>Back to Map</span>
        </Link>
      </div>

      {/* Header */}
      <div className="px-6 lg:px-20 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Sale Type Badge */}
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${saleType.bg} ${saleType.border} border mb-6`}>
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: saleType.fill }} />
            <span className={`font-bold ${saleType.text}`}>{saleType.label} State</span>
          </div>

          <h1 className="text-4xl lg:text-6xl font-black text-white tracking-tight mb-4">
            {state.name}
          </h1>
          <p className="text-xl text-slate-400">
            Tax Sale Investment Guide
          </p>
        </div>
      </div>

      {/* Content Grid */}
      <div className="px-6 lg:px-20 pb-20">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {/* Sale Type Card */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg ${saleType.bg} flex items-center justify-center`}>
                  <Building2 className={saleType.text} size={20} />
                </div>
                <div>
                  <div className="text-sm text-slate-400">Sale Type</div>
                  <div className="font-bold text-white">{saleType.label}</div>
                </div>
              </div>
              <p className="text-slate-400 text-sm">
                {state.sale_type === 'tax_deed' && 'You receive immediate property ownership upon winning the auction. The previous owner cannot redeem the property.'}
                {state.sale_type === 'tax_lien' && 'You purchase a tax lien certificate that earns interest. If taxes remain unpaid, you can foreclose on the property.'}
                {state.sale_type === 'redeemable_deed' && 'You receive deed to the property immediately, but the previous owner has a redemption period to reclaim it.'}
                {state.sale_type === 'hybrid' && 'Sale type varies by municipality within the state. Check local county rules.'}
              </p>
            </div>

            {/* Interest Rate */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-900/50 flex items-center justify-center">
                  <Percent className="text-emerald-400" size={20} />
                </div>
                <div>
                  <div className="text-sm text-slate-400">Interest Rate</div>
                  <div className="font-bold text-white">{state.interest_rate || 'N/A'}</div>
                </div>
              </div>
              <p className="text-slate-400 text-sm">
                {state.interest_rate
                  ? 'Maximum interest rate you can earn on tax lien certificates in this state.'
                  : 'Tax deed states do not offer interest rates - you receive property ownership instead.'}
              </p>
            </div>

            {/* Redemption Period */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-amber-900/50 flex items-center justify-center">
                  <Clock className="text-amber-400" size={20} />
                </div>
                <div>
                  <div className="text-sm text-slate-400">Redemption Period</div>
                  <div className="font-bold text-white">{state.redemption_period || 'None'}</div>
                </div>
              </div>
              <p className="text-slate-400 text-sm">
                {state.redemption_period
                  ? `Previous owners have ${state.redemption_period} to redeem their property by paying taxes plus penalties.`
                  : 'No redemption period. Once you win the auction, you own the property outright.'}
              </p>
            </div>

            {/* Auction Frequency */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-900/50 flex items-center justify-center">
                  <Calendar className="text-blue-400" size={20} />
                </div>
                <div>
                  <div className="text-sm text-slate-400">Auction Frequency</div>
                  <div className="font-bold text-white">{state.auction_frequency}</div>
                </div>
              </div>
              <p className="text-slate-400 text-sm">
                How often tax sales are held in this state. Some states have monthly sales, others annually.
              </p>
            </div>
          </div>

          {/* Top Counties */}
          {state.top_counties && state.top_counties.length > 0 && (
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-8">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <MapPin className="text-slate-400" size={20} />
                Top Counties
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {state.top_counties.map((county) => (
                  <div
                    key={county}
                    className="flex items-center gap-2 text-slate-300"
                  >
                    <div className="w-2 h-2 rounded-full bg-slate-500" />
                    {county}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {state.notes && (
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-8">
              <h2 className="text-xl font-bold text-white mb-4">Important Notes</h2>
              <p className="text-slate-400">{state.notes}</p>
            </div>
          )}

          {/* CTA Section */}
          <div className="bg-gradient-to-r from-blue-900/30 to-slate-800 rounded-xl p-8 border border-blue-800/30">
            {state.has_properties ? (
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">
                  Properties Available in {state.name}
                </h2>
                <p className="text-slate-400 mb-6">
                  We have active tax sale properties with full analysis and scoring.
                </p>
                <Link
                  href="/properties"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors"
                >
                  View Properties
                  <ExternalLink size={18} />
                </Link>
              </div>
            ) : (
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">
                  Coming Soon to {state.name}
                </h2>
                <p className="text-slate-400 mb-6">
                  We&apos;re expanding our coverage. Sign up to be notified when {state.name} properties become available.
                </p>
                <button
                  className="inline-flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors opacity-50 cursor-not-allowed"
                  disabled
                >
                  Notify Me (Coming Soon)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
