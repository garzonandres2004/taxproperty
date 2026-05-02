'use client'

import { useState, useEffect } from 'react'
import { Calculator, AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/ui-utils'

interface MaxBidCalculatorProps {
  propertyId: string
  arv?: number | null
  amountDue?: number | null
  savedRepairEstimate?: number | null
  savedDesiredProfit?: number | null
  savedMaxBidCalculated?: number | null
  onSave?: (maxBid: number) => void
}

export function MaxBidCalculator({
  propertyId,
  arv: initialArv,
  amountDue = 0,
  savedRepairEstimate,
  savedDesiredProfit,
  savedMaxBidCalculated,
  onSave,
}: MaxBidCalculatorProps) {
  // Expert Investor's Formula: Max Bid = (ARV × 80%) - Municipal Liens - $3,500 (quiet title) - Repairs - Desired Profit
  const [arv, setArv] = useState(initialArv?.toString() || '')
  const [repairEstimate, setRepairEstimate] = useState(savedRepairEstimate?.toString() || '0')
  const [municipalLiens, setMunicipalLiens] = useState(amountDue?.toString() || '')
  const [quietTitleCost] = useState('3500') // Fixed at $3,500
  const [desiredProfit, setDesiredProfit] = useState(savedDesiredProfit?.toString() || '')
  const [profitType, setProfitType] = useState<'amount' | 'percent'>('amount')
  const [savedMaxBid, setSavedMaxBid] = useState<number | null>(savedMaxBidCalculated || null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const ARV_PERCENT = 80 // Fixed at 80% per Expert Investor formula

  // Pre-fill municipal liens when amountDue prop changes
  useEffect(() => {
    if (amountDue && amountDue > 0 && !municipalLiens) {
      setMunicipalLiens(amountDue.toString())
    }
  }, [amountDue, municipalLiens])

  // Calculate desired profit amount based on type
  const getDesiredProfitAmount = () => {
    const arvValue = parseFloat(arv) || 0
    const profitValue = parseFloat(desiredProfit) || 0
    if (profitType === 'percent') {
      return arvValue * (profitValue / 100)
    }
    return profitValue
  }

  // Calculate based on Expert Investor's formula
  const calculateMaxBid = () => {
    const arvValue = parseFloat(arv) || 0
    const quickSalePrice = arvValue * (ARV_PERCENT / 100)
    const liens = parseFloat(municipalLiens) || 0
    const quietTitle = parseFloat(quietTitleCost) || 3500
    const repairs = parseFloat(repairEstimate) || 0
    const profit = getDesiredProfitAmount()

    return Math.max(0, quickSalePrice - liens - quietTitle - repairs - profit)
  }

  const maxBid = calculateMaxBid()
  const arvValue = parseFloat(arv) || 0
  const quickSalePrice = arvValue * (ARV_PERCENT / 100)
  const liensAmount = parseFloat(municipalLiens) || 0
  const repairsAmount = parseFloat(repairEstimate) || 0
  const quietTitleAmount = parseFloat(quietTitleCost) || 3500
  const desiredProfitAmount = getDesiredProfitAmount()

  // Determine recommendation color and warning
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

  // "Do Not Exceed" warning logic
  const getDoNotExceedMessage = () => {
    if (!amountDue || amountDue <= 0) return null
    if (maxBid <= 0) return 'Max bid is zero or negative - do not bid on this property'
    if (maxBid < amountDue * 0.5) return 'Max bid is less than 50% of opening bid - likely not viable'
    return null
  }

  const doNotExceedWarning = getDoNotExceedMessage()
  const isViable = maxBid >= (amountDue || 0)

  const handleSave = async () => {
    setIsSaving(true)
    setSaveError(null)
    try {
      const response = await fetch(`/api/properties/${propertyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          max_bid_calculated: maxBid,
          repair_estimate: parseFloat(repairEstimate) || 0,
          desired_profit: desiredProfitAmount,
        }),
      })

      if (response.ok) {
        setSavedMaxBid(maxBid)
        onSave?.(maxBid)
      } else {
        const errorData = await response.json().catch(() => ({}))
        setSaveError(errorData.error || 'Failed to save max bid')
      }
    } catch (error) {
      console.error('Failed to save max bid:', error)
      setSaveError('Network error - please try again')
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
          <p className="text-xs text-slate-500">Expert Investor Formula</p>
        </div>
      </div>

      {/* Formula Display */}
      <div className="bg-slate-50 rounded-lg p-4 mb-6 text-sm text-slate-600">
        <p className="font-medium mb-2">Formula:</p>
        <p className="font-mono text-xs">
          Max Bid = (ARV × 80%) − Municipal Liens − $3,500 − Repairs − Desired Profit
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
              placeholder={initialArv?.toString() || '300000'}
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>
          {initialArv && (
            <p className="text-[10px] text-slate-400 mt-1">Pre-filled from estimated market value</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Municipal Liens
            <span className="ml-1 text-[10px] text-amber-600 font-normal">(survive sale)</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
            <input
              type="number"
              value={municipalLiens}
              onChange={(e) => setMunicipalLiens(e.target.value)}
              placeholder={amountDue?.toString() || '0'}
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>
          {amountDue && (
            <p className="text-[10px] text-slate-400 mt-1">Pre-filled from total amount due</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Repair Estimate
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
            <input
              type="number"
              value={repairEstimate}
              onChange={(e) => setRepairEstimate(e.target.value)}
              placeholder="0"
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Default: $0</p>
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
              disabled
              className="w-full pl-8 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-500 cursor-not-allowed"
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Fixed: $3,500</p>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Desired Profit
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              {profitType === 'amount' && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              )}
              <input
                type="number"
                value={desiredProfit}
                onChange={(e) => setDesiredProfit(e.target.value)}
                placeholder={profitType === 'percent' ? '20' : '20000'}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
              {profitType === 'percent' && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
              )}
            </div>
            <select
              value={profitType}
              onChange={(e) => {
                setProfitType(e.target.value as 'amount' | 'percent')
                setDesiredProfit('') // Reset when switching
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            >
              <option value="amount">$ Amount</option>
              <option value="percent">% of ARV</option>
            </select>
          </div>
        </div>
      </div>

      {/* Calculation Breakdown */}
      <div className="bg-slate-900 text-white rounded-xl p-6 mb-6">
        <h4 className="text-sm font-semibold text-slate-300 mb-4">Calculation Breakdown</h4>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">ARV × 80%</span>
            <span className="font-medium text-emerald-400">+${quickSalePrice.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Less: Municipal Liens</span>
            <span className="font-medium text-rose-400">-${liensAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Less: Quiet Title</span>
            <span className="font-medium text-rose-400">-${quietTitleAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Less: Repairs</span>
            <span className="font-medium text-rose-400">-${repairsAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Less: Desired Profit</span>
            <span className="font-medium text-rose-400">-${desiredProfitAmount.toLocaleString()}</span>
          </div>
        </div>

        <div className="border-t border-slate-700 mt-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 mb-1">MAXIMUM BID</p>
              <p className="text-3xl font-black text-emerald-400">${maxBid.toLocaleString()}</p>
            </div>
            {amountDue && amountDue > 0 && (
              <div className="text-right">
                <p className="text-xs text-slate-400 mb-1">Opening Bid</p>
                <p className="text-lg font-bold">${amountDue.toLocaleString()}</p>
                <p className={cn(
                  "text-xs mt-1",
                  isViable ? "text-emerald-400" : "text-red-400"
                )}>
                  {isViable ? '✓ Viable' : '✗ Too High'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Do Not Exceed Warning */}
      {doNotExceedWarning && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-800">DO NOT EXCEED</p>
            <p className="text-sm text-red-700 mt-1">{doNotExceedWarning}</p>
            {amountDue && maxBid > 0 && (
              <p className="text-xs text-red-600 mt-2">
                Your calculated max bid is {((maxBid / amountDue) * 100).toFixed(0)}% of the opening bid
              </p>
            )}
          </div>
        </div>
      )}

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
          {amountDue && amountDue > 0 && maxBid > 0 && (
            <p className="text-sm mt-1 opacity-90">
              Max bid / Opening bid ratio: {((maxBid / amountDue) * 100).toFixed(0)}%
            </p>
          )}
        </div>
      </div>

      {/* Save Error */}
      {saveError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
          {saveError}
        </div>
      )}

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
            Save Max Bid Calculation
          </>
        )}
      </button>

      {/* Note */}
      <div className="mt-4 flex items-start gap-2 text-xs text-slate-500">
        <Info size={14} className="shrink-0 mt-0.5" />
        <p>
          Based on Expert Investor's formula. Municipal liens in Utah survive the tax deed sale.
          Quiet title action required to clear title (~$3,500). Always verify amounts with county before bidding.
        </p>
      </div>
    </div>
  )
}
