'use client'

import { useState, useEffect } from 'react'
import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  Car,
  DollarSign,
  FileSearch,
  MapPin,
  Scale,
  Home,
  Calculator,
  ExternalLink,
  Save
} from 'lucide-react'
import { cn } from '@/lib/ui-utils'

interface ChecklistItem {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  required: boolean
  link?: string
  linkText?: string
}

interface DueDiligenceChecklistProps {
  propertyId: string
  parcelNumber: string
  address?: string | null
  amountDue?: number | null
  marketValue?: number | null
}

const checklistItems: ChecklistItem[] = [
  {
    id: 'drive_by',
    title: 'Drive-by Inspection',
    description: 'Physically visit the property. Assess condition, check neighborhood, verify accessibility. Take photos of any damage.',
    icon: <Car className="w-5 h-5" />,
    required: true,
    linkText: 'Open in Google Maps',
  },
  {
    id: 'property_value',
    title: 'Property Value Check (ARV)',
    description: 'Verify After Repair Value using Zillow, county assessor, and comparable sales. Get at least 3 comps.',
    icon: <DollarSign className="w-5 h-5" />,
    required: true,
    link: 'https://www.zillow.com',
    linkText: 'Open Zillow',
  },
  {
    id: 'tax_sanity',
    title: 'Tax Sanity Check',
    description: 'Does the tax amount make sense for the property value? Red flag if $2,800 taxes on $1M property.',
    icon: <AlertTriangle className="w-5 h-5" />,
    required: true,
  },
  {
    id: 'parcel_verify',
    title: 'Parcel ID Verification',
    description: 'Cross-reference address with county GIS. Never trust the address alone - always verify with parcel ID.',
    icon: <MapPin className="w-5 h-5" />,
    required: true,
  },
  {
    id: 'municipal_liens',
    title: 'Municipal Lien Check (UT)',
    description: 'In Utah, municipal liens survive the tax deed sale. Check county/city claims. Subtract from max bid.',
    icon: <Scale className="w-5 h-5" />,
    required: true,
  },
  {
    id: 'chain_title',
    title: 'Chain of Title Review',
    description: 'Get complete ownership history since current owner. Look for gaps or unusual transfers. Search county recorder.',
    icon: <FileSearch className="w-5 h-5" />,
    required: false,
  },
  {
    id: 'occupancy',
    title: 'Occupancy Check',
    description: 'Is property occupied? Look for cars, lights, maintenance. Check eviction costs if tenant present.',
    icon: <Home className="w-5 h-5" />,
    required: true,
  },
  {
    id: 'max_bid',
    title: 'Max Bid Calculation',
    description: 'Calculate maximum bid using ARV × 80% - Costs - Profit formula. Include quiet title (~$3,500).',
    icon: <Calculator className="w-5 h-5" />,
    required: true,
  },
]

export function DueDiligenceChecklist({
  propertyId,
  parcelNumber,
  address,
  amountDue,
  marketValue,
}: DueDiligenceChecklistProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Calculate tax sanity
  const taxSanityRatio = amountDue && marketValue && marketValue > 0
    ? (amountDue / marketValue) * 100
    : null
  const taxSanityWarning = taxSanityRatio !== null && taxSanityRatio < 0.1

  // Generate Google Maps link
  const googleMapsLink = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address + ', Utah')}`
    : null

  // Generate Parcel Map link
  const parcelMapLink = `https://maps.utahcounty.gov/ParcelMap/ParcelMap?parcel=${parcelNumber}`

  const toggleItem = (id: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const updateNote = (id: string, note: string) => {
    setNotes((prev) => ({ ...prev, [id]: note }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // In a real implementation, save to database
      // await fetch(`/api/properties/${propertyId}/checklist`, {
      //   method: 'PATCH',
      //   body: JSON.stringify({ checkedItems: Array.from(checkedItems), notes }),
      // })
      setTimeout(() => {
        setLastSaved(new Date())
        setIsSaving(false)
      }, 500)
    } catch (error) {
      console.error('Failed to save checklist:', error)
      setIsSaving(false)
    }
  }

  const completedCount = checkedItems.size
  const requiredCount = checklistItems.filter((item) => item.required).length
  const requiredCompleted = checklistItems.filter(
    (item) => item.required && checkedItems.has(item.id)
  ).length
  const progressPercent = (completedCount / checklistItems.length) * 100

  const getItemLink = (item: ChecklistItem) => {
    switch (item.id) {
      case 'drive_by':
        return googleMapsLink
      case 'parcel_verify':
        return parcelMapLink
      case 'municipal_liens':
        return `https://www.utahcounty.gov/auditor/recordssearch/index.cfm`
      case 'chain_title':
        return `https://www.utahcounty.gov/auditor/recordssearch/index.cfm`
      default:
        return item.link
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <FileSearch className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Due Diligence Checklist</h3>
          <p className="text-xs text-slate-500">Dustin Hahn Workflow</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-600">
            Progress: {completedCount}/{checklistItems.length}
          </span>
          <span className="text-sm font-bold text-slate-900">{Math.round(progressPercent)}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Required items: {requiredCompleted}/{requiredCount}
        </p>
      </div>

      {/* Tax Sanity Alert */}
      {taxSanityWarning && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-800">Tax Sanity Warning</p>
            <p className="text-sm text-amber-700 mt-1">
              Tax amount is only {taxSanityRatio?.toFixed(2)}% of market value.
              This may indicate special circumstances or hidden problems. Investigate further.
            </p>
          </div>
        </div>
      )}

      {/* Checklist Items */}
      <div className="space-y-4 mb-6">
        {checklistItems.map((item) => {
          const isChecked = checkedItems.has(item.id)
          const link = getItemLink(item)

          return (
            <div
              key={item.id}
              className={cn(
                'border rounded-lg p-4 transition-all',
                isChecked
                  ? 'bg-emerald-50/50 border-emerald-200'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              )}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleItem(item.id)}
                  className="mt-0.5 shrink-0"
                >
                  {isChecked ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-300" />
                  )}
                </button>

                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={cn(
                        'p-1 rounded',
                        isChecked ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
                      )}
                    >
                      {item.icon}
                    </span>
                    <span
                      className={cn(
                        'font-bold',
                        isChecked ? 'text-emerald-900 line-through' : 'text-slate-900'
                      )}
                    >
                      {item.title}
                    </span>
                    {item.required && (
                      <span className="text-[10px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded font-bold">
                        REQUIRED
                      </span>
                    )}
                  </div>

                  <p
                    className={cn(
                      'text-sm mb-2',
                      isChecked ? 'text-emerald-700' : 'text-slate-600'
                    )}
                  >
                    {item.description}
                  </p>

                  {link && (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {item.linkText || 'Open'} <ExternalLink size={12} />
                    </a>
                  )}

                  {/* Notes field */}
                  <div className="mt-3">
                    <textarea
                      value={notes[item.id] || ''}
                      onChange={(e) => updateNote(item.id, e.target.value)}
                      placeholder="Add notes..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary */}
      <div className="bg-slate-50 rounded-lg p-4 mb-6">
        <h4 className="font-bold text-slate-900 mb-2">Quick Summary</h4>
        <ul className="text-sm text-slate-600 space-y-1">
          <li>• {completedCount} of {checklistItems.length} items completed</li>
          <li>• {requiredCompleted} of {requiredCount} required items done</li>
          {taxSanityWarning && <li>• Tax sanity check flagged</li>}
          {progressPercent === 100 && <li>• All due diligence complete!</li>}
        </ul>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full btn btn-primary gap-2"
      >
        {isSaving ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            Saving...
          </>
        ) : lastSaved ? (
          <>
            <CheckCircle2 size={18} />
            Saved at {lastSaved.toLocaleTimeString()}
          </>
        ) : (
          <>
            <Save size={18} />
            Save Checklist
          </>
        )}
      </button>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-slate-200 text-xs text-slate-500">
        <p className="font-medium mb-1">Based on Dustin Hahn's Workflow:</p>
        <p>
          1. Drive property → 2. Check ARV → 3. Tax sanity → 4. Verify parcel →
          5. Check liens → 6. Title search → 7. Occupancy → 8. Calculate max bid
        </p>
      </div>
    </div>
  )
}
