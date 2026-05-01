import { USMap } from '@/components/map/USMap';
import { stateData, SALE_TYPE_COLORS } from '@/lib/state-data';

export const metadata = {
  title: 'Tax Sale Types by State | TaxProperty',
  description: 'Interactive map showing tax sale types across all 50 US states',
};

export default function StatesPage() {
  // Count by sale type
  const counts = {
    tax_deed: stateData.filter(s => s.sale_type === 'tax_deed').length,
    tax_lien: stateData.filter(s => s.sale_type === 'tax_lien').length,
    redeemable_deed: stateData.filter(s => s.sale_type === 'redeemable_deed').length,
    hybrid: stateData.filter(s => s.sale_type === 'hybrid').length,
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="px-6 lg:px-20 py-12 border-b border-slate-800">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tight mb-4">
            Tax Sale Types by State
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl">
            Each state has different tax sale laws. Understand the sale type, redemption periods,
            and interest rates before investing.
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="px-6 lg:px-20 py-8 bg-slate-800/50 border-b border-slate-800">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-lg font-bold text-white mb-4">Legend</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(SALE_TYPE_COLORS).map(([type, colors]) => (
              <div key={type} className={`flex items-center gap-3 p-3 rounded-lg bg-slate-800 border ${colors.border}`}>
                <div className="w-4 h-4 rounded" style={{ backgroundColor: colors.fill }} />
                <div>
                  <div className={`font-semibold ${colors.text}`}>{colors.label}</div>
                  <div className="text-sm text-slate-500">{counts[type as keyof typeof counts]} states</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Map Section */}
      <div className="px-6 lg:px-20 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Map */}
            <div className="flex-1">
              <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                <USMap className="w-full" />
                <p className="text-sm text-slate-500 mt-4 text-center">
                  Click any state to view detailed information about their tax sale process.
                </p>
              </div>
            </div>

            {/* Sidebar */}
            <div className="w-full lg:w-80 space-y-6">
              {/* Quick Stats */}
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-bold text-white mb-4">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Total States</span>
                    <span className="font-bold text-white">50</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Tax Deed States</span>
                    <span className="font-bold text-blue-400">{counts.tax_deed}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Tax Lien States</span>
                    <span className="font-bold text-emerald-400">{counts.tax_lien}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Hybrid States</span>
                    <span className="font-bold text-violet-400">{counts.hybrid}</span>
                  </div>
                </div>
              </div>

              {/* Sale Type Explanations */}
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-bold text-white mb-4">Sale Types</h3>
                <div className="space-y-4 text-sm">
                  <div>
                    <div className="font-semibold text-blue-400 mb-1">Tax Deed</div>
                    <p className="text-slate-400">You receive immediate property ownership. No redemption period.</p>
                  </div>
                  <div>
                    <div className="font-semibold text-emerald-400 mb-1">Tax Lien</div>
                    <p className="text-slate-400">You buy a certificate earning interest. Foreclose if unpaid.</p>
                  </div>
                  <div>
                    <div className="font-semibold text-amber-400 mb-1">Redeemable Deed</div>
                    <p className="text-slate-400">Immediate ownership but owner can redeem with penalties.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
