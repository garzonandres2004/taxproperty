'use client'

import { useState, useEffect } from 'react'
import { Calculator, AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { cn } from '@/lib/ui-utils'

interface MaxBidCalculatorProps {
  propertyId: string
  arv?: number | null
  amountDue?: number | null
  onSave?: (maxBid: number) => void
}

export function MaxBidCalculator({
  propertyId,
  arv: initialArv,
  amountDue = 0,
  onSave,
}: MaxBidCalculatorProps) {
  // Dustin Hahn's Formula
  const [arv, setArv] = useState(initialArv?.toString() || '')
  const [repairCosts, setRepairCosts] = useState('')
  const [municipalLiens, setMunicipalLiens] = useState('')
  const [quietTitleCost, setQuietTitleCost] = useState('3500') // Default ~$3,500
  const [holdingCosts, setHoldingCosts] = useState('')
  const [desiredProfit, setDesiredProfit] = useState('')
  const [quickSalePercent, setQuickSalePercent] = useState('80') // Default 80%
  const [savedMaxBid, setSavedMaxBid] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Calculate based on Dustin Hahn's formula
  const calculateMaxBid = () => {
    const quickSalePrice = (parseFloat(arv) || 0) * (parseFloat(quickSalePercent) || 80) / 100
    const totalCosts =
      (parseFloat(repairCosts) || 0) +
      (parseFloat(municipalLiens) || 0) +
      (parseFloat(quietTitleCost) || 3500) +
      (parseFloat(holdingCosts) || 0)
    const profit = parseFloat(desiredProfit) || 0

    return Math.max(0, quickSalePrice - totalCosts - profit)
  }

  const maxBid = calculateMaxBid()
  const quickSalePrice = (parseFloat(arv) || 0) * (parseFloat(quickSalePercent) || 80) / 100
  const totalCosts =
    (parseFloat(repairCosts) || 0) +
    (parseFloat(municipalLiens) || 0) +
    (parseFloat(quietTitleCost) || 3500) +
    (parseFloat(holdingCosts) || 0)

  // Determine recommendation color
  const getRecommendationColor = () => {
    if (!amountDue || amountDue <= 0) return 'gray'
    const ratio = maxBid / amountDue
    if (ratio >= 1.5) return 'green' // Great deal
    if (ratio >= 1.0) return 'yellow' // Good deal
    if (ratio >= 0.8) return 'orange' // Marginal
    return 'red' // Don't bid
  }

  const recommendationColors = {
    green: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    yellow: 'bg-amber-100 text-amber-800 border-amber-200',
    orange: 'bg-orange-100 text-orange-800 border-orange-200',
    red: 'bg-red-100 text-red-800 border-red-200',
    gray: 'bg-slate-100 text-slate-800 border-slate-200',
  }

  const recommendationText = {
    green: 'Strong Bid Opportunity',
    yellow: 'Good Bid Opportunity',
    orange: 'Marginal Deal - Research More',
    red: 'Avoid - Low Margin',
    gray: 'Calculate Max Bid',
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/properties/${propertyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_bid: maxBid }),
      })

      if (response.ok) {
        setSavedMaxBid(maxBid)
        onSave?.(maxBid)
      }
    } catch (error) {
      console.error('Failed to save max bid:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-emerald-100 rounded-lg">
          <Calculator className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Max Bid Calculator</h3>
          <p className="text-xs text-slate-500">Dustin Hahn Formula</p>
        </div>
      </div>

      {/* Formula Display */}
      <div className="bg-slate-50 rounded-lg p-4 mb-6 text-sm text-slate-600">
        <p className="font-medium mb-2">Formula:</p>
        <p className="font-mono text-xs">
          Max Bid = (ARV × {quickSalePercent}%) − Costs − Profit
        </p>
      </div>

      {/* Input Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            ARV (After Repair Value)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
            <input
              type="number"
              value={arv}
              onChange={(e) => setArv(e.target.value)}
              placeholder="300000"
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Quick Sale %
          </label>
          <div className="relative">
            <input
              type="number"
              value={quickSalePercent}
              onChange={(e) => setQuickSalePercent(e.target.value)}
              className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Dustin recommends 80%</p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Repair Costs
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
            <input
              type="number"
              value={repairCosts}
              onChange={(e) => setRepairCosts(e.target.value)}
              placeholder="15000"
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Municipal Liens
            <span className="ml-1 text-[10px] text-amber-600 font-normal">(UT: survive sale)</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
            <input
              type="number"
              value={municipalLiens}
              onChange={(e) => setMunicipalLiens(e.target.value)}
              placeholder="0"
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Quiet Title Cost
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
            <input
              type="number"
              value={quietTitleCost}
              onChange={(e) => setQuietTitleCost(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1">~$3,500 typical</p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Holding Costs
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
            <input
              type="number"
              value={holdingCosts}
              onChange={(e) => setHoldingCosts(e.target.value)}
              placeholder="2000"
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Desired Profit
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
            <input
              type="number"
              value={desiredProfit}
              onChange={(e) => setDesiredProfit(e.target.value)}
              placeholder="20000"
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Calculation Summary */}
      <div className="bg-slate-900 text-white rounded-xl p-6 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs text-slate-400 mb-1">Quick Sale Price</p>
            <p className="text-lg font-bold">${quickSalePrice.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Total Costs</p>
            <p className="text-lg font-bold text-amber-400">-${totalCosts.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Desired Profit</p>
            <p className="text-lg font-bold text-rose-400">-${(parseFloat(desiredProfit) || 0).toLocaleString()}</p>
          </div>
        </div>

        <div className="border-t border-slate-700 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 mb-1">Maximum Bid</p>
              <p className="text-3xl font-black text-emerald-400">${maxBid.toLocaleString()}</p>
            </div>
            {amountDue && amountDue > 0 && (
              <div className="text-right">
                <p className="text-xs text-slate-400 mb-1">Opening Bid</p>
                <p className="text-lg font-bold">${amountDue.toLocaleString()}</p>
                <p className={cn(
                  "text-xs mt-1",
                  maxBid >= amountDue ? "text-emerald-400" : "text-red-400"
                )}>
                  {maxBid >= amountDue ? '✓ Viable' : '✗ Too High'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <div className={cn(
        "rounded-lg p-4 mb-6 border flex items-start gap-3",
        recommendationColors[getRecommendationColor()]
      )}>
        {getRecommendationColor() === 'green' ? (
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
        )}
        <div>
          <p className="font-bold">{recommendationText[getRecommendationColor()]}</p>
          {amountDue && amountDue > 0 && (
            <p className="text-sm mt-1 opacity-90">
              Your max bid is {((maxBid / amountDue) * 100).toFixed(0)}% of the opening bid
            </p>
          )}
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full btn btn-primary gap-2"
      >
        {isSaving ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Saving...
          </>
        ) : savedMaxBid ? (
          <>
            <CheckCircle2 size={18} />
            Saved: ${savedMaxBid.toLocaleString()}
          </>
        ) : (
          <>
            <Calculator size={18} />
            Save Max Bid
          </>
        )}
      </button>

      {/* Note */}
      <div className="mt-4 flex items-start gap-2 text-xs text-slate-500">
        <Info size={14} className="shrink-0 mt-0.5" />
        <p>
          Based on Dustin Hahn's formula. Always verify municipal liens in Utah -
          they survive the tax deed sale. Consider additional due diligence before bidding.
        </p>
      </div>
    </div>
  )
}
