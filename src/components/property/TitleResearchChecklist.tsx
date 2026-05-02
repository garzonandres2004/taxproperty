'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  Car,
  FileSearch,
  Users,
  Scale,
  Building,
  Home,
  DollarSign,
  MapPin,
  Gavel,
  ExternalLink,
  Save,
  Loader2,
  Clock,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/ui-utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

type ChecklistStatus = 'pending' | 'clear' | 'flagged'

interface ChecklistItemConfig {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  link?: string
  linkText?: string
  autoVerified?: boolean
  autoVerifiedCondition?: string
}

interface ChecklistItem {
  status: ChecklistStatus
  notes: string | null
  completed_at: string | null
  auto_verified?: boolean
}

interface TitleResearchChecklistData {
  // Step 1: Drive-by/Street View
  drive_by_status: ChecklistStatus
  drive_by_notes: string | null
  drive_by_completed_at: string | null
  drive_by_auto_verified: boolean

  // Step 2: Deed search
  deed_search_status: ChecklistStatus
  deed_search_notes: string | null
  deed_search_completed_at: string | null

  // Step 3: Grantor/Grantee
  grantor_grantee_status: ChecklistStatus
  grantor_grantee_notes: string | null
  grantor_grantee_completed_at: string | null

  // Step 4: Municipal liens
  municipal_liens_status: ChecklistStatus
  municipal_liens_notes: string | null
  municipal_liens_completed_at: string | null

  // Step 5: Owner lien search
  owner_lien_search_status: ChecklistStatus
  owner_lien_search_notes: string | null
  owner_lien_search_completed_at: string | null

  // Step 6: HOA
  hoa_status: ChecklistStatus
  hoa_notes: string | null
  hoa_completed_at: string | null

  // Step 7: ARV
  arv_verified_status: ChecklistStatus
  arv_verified_notes: string | null
  arv_verified_completed_at: string | null

  // Step 8: GIS
  gis_verified_status: ChecklistStatus
  gis_verified_notes: string | null
  gis_verified_completed_at: string | null
  gis_auto_verified: boolean

  // Step 9: Lawsuit
  lawsuit_search_status: ChecklistStatus
  lawsuit_search_notes: string | null
  lawsuit_search_completed_at: string | null

  total_completed: number
  last_updated_at: string
}

interface TitleResearchChecklistProps {
  propertyId: string
  parcelNumber: string
  ownerName?: string | null
  address?: string | null
  hasStreetView?: boolean
  hasAerial?: boolean
  estimatedMarketValue?: number | null
  county?: string
}

const TOTAL_STEPS = 9

export function TitleResearchChecklist({
  propertyId,
  parcelNumber,
  ownerName,
  address,
  hasStreetView = false,
  hasAerial = false,
  estimatedMarketValue,
  county = 'utah'
}: TitleResearchChecklistProps) {
  const [checklist, setChecklist] = useState<TitleResearchChecklistData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Generate URLs based on property data and county
  const parcelSerial = parcelNumber.replace(/:/g, '')
  const isTooele = county === 'tooele'

  // Tooele County URLs
  const tooeleMedicilandUrl = `https://search.tooeleco.gov.mediciland.com/?q=${parcelNumber}`
  const tooeleRecorderUrl = 'https://tooeleco.gov/departments/administration/recorder_surveyor/property_records_search.php'
  const tooeleAuditorUrl = 'https://tooeleco.gov/departments/administration/auditor/'

  // Utah County URLs (default)
  const landRecordsUrl = `https://www.utahcounty.gov/LandRecords/Property.asp?av_serial=${parcelSerial}`
  const recorderUrl = 'https://www.utahcounty.gov/LandRecords/Index.asp'
  const auditorUrl = 'https://www.utahcounty.gov/auditor/recordssearch/index.cfm'
  const parcelMapUrl = `https://maps.utahcounty.gov/ParcelMap/ParcelMap?parcel=${parcelNumber}`
  const utahCourtsUrl = 'https://www.utcourts.gov/courts/district/utah.html'

  // Define the 9 checklist items from Expert Investor methodology
  // URLs change based on county (Tooele vs Utah)
  const checklistItems: ChecklistItemConfig[] = [
    {
      id: 'drive_by',
      title: 'Drive-by / Street View Verified',
      description: 'Verify property exists and matches description. Check neighborhood, access, and visible issues via Street View or physical visit.',
      icon: <Car className="w-5 h-5" />,
      link: address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address + (isTooele ? ', Tooele County, Utah' : ', Utah'))}`
        : undefined,
      linkText: 'Open Google Maps',
      autoVerified: hasStreetView,
      autoVerifiedCondition: 'Street View image available'
    },
    {
      id: 'deed_search',
      title: 'County Recorder Deed Search Done',
      description: 'Search county recorder for deed history. Verify legal description matches tax records. Look for quitclaim deeds or unusual transfers.',
      icon: <FileSearch className="w-5 h-5" />,
      link: isTooele ? tooeleRecorderUrl : recorderUrl,
      linkText: isTooele ? 'Tooele County Recorder' : 'Utah County Recorder'
    },
    {
      id: 'grantor_grantee',
      title: 'Grantor/Grantee Chain Reviewed',
      description: 'Review chain of title from current owner backwards. Verify no breaks in ownership chain. Note any foreclosures, divorces, or probate transfers.',
      icon: <Users className="w-5 h-5" />,
      link: isTooele ? tooeleMedicilandUrl : landRecordsUrl,
      linkText: isTooele ? 'Mediciland Search (Google Auth)' : 'Land Records Search'
    },
    {
      id: 'municipal_liens',
      title: 'Municipal Liens Checked',
      description: isTooele
        ? 'Search for city/county liens that survive tax sale (Tooele: municipal liens survive). Check Tooele County records.'
        : 'Search for city/county liens that survive tax sale (Utah: municipal liens survive). Check code enforcement, utility, weed abatement liens.',
      icon: <Scale className="w-5 h-5" />,
      link: isTooele ? tooeleAuditorUrl : auditorUrl,
      linkText: isTooele ? 'Tooele County Auditor' : 'Auditor Records Search'
    },
    {
      id: 'owner_lien_search',
      title: 'Owner Name Lien Search Done',
      description: 'Search current owner name in county records for UCC filings, judgments, other liens against owner that may attach to property.',
      icon: <Building className="w-5 h-5" />,
      link: isTooele ? tooeleMedicilandUrl : auditorUrl,
      linkText: isTooele ? 'Search Mediciland by Owner' : 'Search by Owner Name'
    },
    {
      id: 'hoa',
      title: 'HOA Status Checked',
      description: 'Determine if property is in HOA. HOA liens may survive tax sale in some jurisdictions. Get HOA contact info and payment status.',
      icon: <Home className="w-5 h-5" />,
      link: isTooele ? tooeleMedicilandUrl : landRecordsUrl,
      linkText: isTooele ? 'Check CCRs in Mediciland' : 'Check CCRs in Records'
    },
    {
      id: 'arv_verified',
      title: 'ARV Verified with Market Value',
      description: 'Confirm After Repair Value using comps, Zillow, county assessor. Verify estimated_market_value matches your analysis. Adjust max bid if needed.',
      icon: <DollarSign className="w-5 h-5" />,
      link: estimatedMarketValue
        ? `https://www.zillow.com/homes/${encodeURIComponent(parcelNumber)}`
        : 'https://www.zillow.com',
      linkText: 'Check Zillow Comps'
    },
    {
      id: 'gis_verified',
      title: 'GIS / Parcel Boundary Verified',
      description: 'Verify parcel boundaries match legal description. Check for encroachments, easements, or boundary disputes using county GIS.',
      icon: <MapPin className="w-5 h-5" />,
      link: isTooele ? tooeleMedicilandUrl : parcelMapUrl,
      linkText: isTooele ? 'Tooele County Parcel Search' : 'Utah County Parcel Map',
      autoVerified: hasAerial,
      autoVerifiedCondition: 'Aerial imagery available'
    },
    {
      id: 'lawsuit_search',
      title: 'Lawsuit Search Done',
      description: 'Search court records for active litigation involving property or owner. Look for foreclosure proceedings, partition suits, quiet title actions.',
      icon: <Gavel className="w-5 h-5" />,
      link: isTooele ? 'https://www.utcourts.gov/courts/district/tooele.html' : utahCourtsUrl,
      linkText: isTooele ? 'Tooele Courts Search' : 'Utah Courts Search'
    }
  ]

  // Fetch checklist data
  const fetchChecklist = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/properties/${propertyId}/title-research`)
      if (!response.ok) {
        throw new Error('Failed to fetch checklist')
      }
      const data = await response.json()
      setChecklist(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load checklist')
    } finally {
      setLoading(false)
    }
  }, [propertyId])

  useEffect(() => {
    fetchChecklist()
  }, [fetchChecklist])

  // Update checklist item
  const updateItem = async (itemId: string, status: ChecklistStatus, notes?: string) => {
    try {
      setSaving(true)
      const response = await fetch(`/api/properties/${propertyId}/title-research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: itemId, status, notes })
      })

      if (!response.ok) {
        throw new Error('Failed to update checklist')
      }

      const updated = await response.json()
      setChecklist(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  // Get item data from checklist
  const getItemData = (itemId: string): ChecklistItem => {
    if (!checklist) {
      return { status: 'pending', notes: null, completed_at: null }
    }

    switch (itemId) {
      case 'drive_by':
        return {
          status: checklist.drive_by_status,
          notes: checklist.drive_by_notes,
          completed_at: checklist.drive_by_completed_at,
          auto_verified: checklist.drive_by_auto_verified
        }
      case 'deed_search':
        return {
          status: checklist.deed_search_status,
          notes: checklist.deed_search_notes,
          completed_at: checklist.deed_search_completed_at
        }
      case 'grantor_grantee':
        return {
          status: checklist.grantor_grantee_status,
          notes: checklist.grantor_grantee_notes,
          completed_at: checklist.grantor_grantee_completed_at
        }
      case 'municipal_liens':
        return {
          status: checklist.municipal_liens_status,
          notes: checklist.municipal_liens_notes,
          completed_at: checklist.municipal_liens_completed_at
        }
      case 'owner_lien_search':
        return {
          status: checklist.owner_lien_search_status,
          notes: checklist.owner_lien_search_notes,
          completed_at: checklist.owner_lien_search_completed_at
        }
      case 'hoa':
        return {
          status: checklist.hoa_status,
          notes: checklist.hoa_notes,
          completed_at: checklist.hoa_completed_at
        }
      case 'arv_verified':
        return {
          status: checklist.arv_verified_status,
          notes: checklist.arv_verified_notes,
          completed_at: checklist.arv_verified_completed_at
        }
      case 'gis_verified':
        return {
          status: checklist.gis_verified_status,
          notes: checklist.gis_verified_notes,
          completed_at: checklist.gis_verified_completed_at,
          auto_verified: checklist.gis_auto_verified
        }
      case 'lawsuit_search':
        return {
          status: checklist.lawsuit_search_status,
          notes: checklist.lawsuit_search_notes,
          completed_at: checklist.lawsuit_search_completed_at
        }
      default:
        return { status: 'pending', notes: null, completed_at: null }
    }
  }

  // Toggle item status
  const toggleStatus = (itemId: string, currentStatus: ChecklistStatus) => {
    const newStatus: ChecklistStatus = currentStatus === 'clear' ? 'pending' : 'clear'
    const itemData = getItemData(itemId)
    updateItem(itemId, newStatus, itemData.notes || undefined)
  }

  // Flag item (mark as needing attention)
  const flagItem = (itemId: string, currentStatus: ChecklistStatus) => {
    const newStatus: ChecklistStatus = currentStatus === 'flagged' ? 'pending' : 'flagged'
    const itemData = getItemData(itemId)
    updateItem(itemId, newStatus, itemData.notes || undefined)
  }

  // Update notes
  const updateNotes = (itemId: string, notes: string) => {
    const itemData = getItemData(itemId)
    updateItem(itemId, itemData.status, notes)
  }

  // Get progress color
  const getProgressColor = (percent: number) => {
    if (percent === 100) return 'bg-emerald-500'
    if (percent >= 66) return 'bg-blue-500'
    if (percent >= 33) return 'bg-yellow-500'
    return 'bg-slate-300'
  }

  // Render status badge
  const renderStatusBadge = (status: ChecklistStatus, autoVerified?: boolean) => {
    if (autoVerified) {
      return (
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
          <Sparkles className="w-3 h-3 mr-1" />
          Auto-Verified
        </Badge>
      )
    }

    switch (status) {
      case 'clear':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Clear
          </Badge>
        )
      case 'flagged':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Flagged
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200">
            <Circle className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        )
    }
  }

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-slate-200 rounded w-1/3"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2 mt-2"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-slate-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Error Loading Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
          <Button onClick={fetchChecklist} variant="outline" className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const completedCount = checklist?.total_completed || 0
  const progressPercent = Math.round((completedCount / TOTAL_STEPS) * 100)
  const hasFlaggedItems = checklistItems.some(
    item => getItemData(item.id).status === 'flagged'
  )

  return (
    <Card className={cn(hasFlaggedItems && 'border-red-200')}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileSearch className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Title Research Checklist</CardTitle>
              <CardDescription>
                Expert Investor 9-Step Process — {completedCount}/{TOTAL_STEPS} Completed
              </CardDescription>
            </div>
          </div>
          {saving && (
            <div className="flex items-center text-sm text-slate-500">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Research Progress</span>
            <span className={cn(
              'font-semibold',
              progressPercent === 100 ? 'text-emerald-600' : 'text-slate-900'
            )}>
              {progressPercent}%
            </span>
          </div>
          <Progress
            value={progressPercent}
            className="h-2"
          />
          {progressPercent === 100 && (
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
              All title research steps completed!
            </div>
          )}
          {hasFlaggedItems && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertTriangle className="w-4 h-4" />
              Some items are flagged — review before bidding
            </div>
          )}
        </div>

        {/* Checklist Items */}
        <div className="space-y-3">
          {checklistItems.map((item, index) => {
            const itemData = getItemData(item.id)
            const isCompleted = itemData.status === 'clear'
            const isFlagged = itemData.status === 'flagged'
            const isPending = itemData.status === 'pending'

            return (
              <div
                key={item.id}
                className={cn(
                  'border rounded-lg p-4 transition-all',
                  isCompleted
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : isFlagged
                      ? 'bg-red-50/50 border-red-200'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Status Toggle */}
                  <button
                    onClick={() => toggleStatus(item.id, itemData.status)}
                    className={cn(
                      'mt-0.5 shrink-0 p-1 rounded transition-colors',
                      isCompleted
                        ? 'text-emerald-600 hover:bg-emerald-100'
                        : isFlagged
                          ? 'text-red-600 hover:bg-red-100'
                          : 'text-slate-300 hover:text-slate-400 hover:bg-slate-100'
                    )}
                    title={isCompleted ? 'Mark as pending' : 'Mark as clear'}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : isFlagged ? (
                      <AlertTriangle className="w-6 h-6" />
                    ) : (
                      <Circle className="w-6 h-6" />
                    )}
                  </button>

                  <div className="flex-grow min-w-0">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-400 w-5">
                          {index + 1}.
                        </span>
                        <span
                          className={cn(
                            'font-semibold',
                            isCompleted
                              ? 'text-emerald-900 line-through'
                              : isFlagged
                                ? 'text-red-900'
                                : 'text-slate-900'
                          )}
                        >
                          {item.title}
                        </span>
                        {renderStatusBadge(itemData.status, itemData.auto_verified)}
                      </div>

                      {/* Flag Button */}
                      <button
                        onClick={() => flagItem(item.id, itemData.status)}
                        className={cn(
                          'text-xs px-2 py-1 rounded border transition-colors shrink-0',
                          isFlagged
                            ? 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200'
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                        )}
                        title={isFlagged ? 'Remove flag' : 'Flag for review'}
                      >
                        {isFlagged ? 'Unflag' : 'Flag'}
                      </button>
                    </div>

                    {/* Description */}
                    <p
                      className={cn(
                        'text-sm mb-2 ml-7',
                        isCompleted
                          ? 'text-emerald-700'
                          : isFlagged
                            ? 'text-red-700'
                            : 'text-slate-600'
                      )}
                    >
                      {item.description}
                    </p>

                    {/* Auto-verified notice */}
                    {itemData.auto_verified && item.autoVerifiedCondition && (
                      <div className="ml-7 flex items-center gap-2 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded w-fit">
                        <Sparkles className="w-3 h-3" />
                        Auto-verified: {item.autoVerifiedCondition}
                      </div>
                    )}

                    {/* Link */}
                    {item.link && !itemData.auto_verified && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-7 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium mt-2"
                      >
                        {item.linkText || 'Open'}
                        <ExternalLink size={12} />
                      </a>
                    )}

                    {/* Completed timestamp */}
                    {itemData.completed_at && !itemData.auto_verified && (
                      <div className="ml-7 flex items-center gap-1 text-xs text-slate-400 mt-2">
                        <Clock className="w-3 h-3" />
                        Completed {new Date(itemData.completed_at).toLocaleDateString()}
                      </div>
                    )}

                    {/* Notes field */}
                    <div className="mt-3 ml-7">
                      <textarea
                        value={itemData.notes || ''}
                        onChange={(e) => updateNotes(item.id, e.target.value)}
                        placeholder="Add research notes..."
                        className={cn(
                          'w-full px-3 py-2 border rounded-lg text-sm resize-none focus:ring-2 focus:outline-none transition-colors',
                          isCompleted
                            ? 'bg-white border-emerald-200 focus:ring-emerald-500 focus:border-emerald-500'
                            : isFlagged
                              ? 'bg-white border-red-200 focus:ring-red-500 focus:border-red-500'
                              : 'bg-white border-slate-200 focus:ring-blue-500 focus:border-blue-500'
                        )}
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
        <div className={cn(
          'rounded-lg p-4',
          progressPercent === 100
            ? 'bg-emerald-50 border border-emerald-200'
            : hasFlaggedItems
              ? 'bg-red-50 border border-red-200'
              : 'bg-slate-50 border border-slate-200'
        )}>
          <h4 className={cn(
            'font-semibold mb-2',
            progressPercent === 100
              ? 'text-emerald-900'
              : hasFlaggedItems
                ? 'text-red-900'
                : 'text-slate-900'
          )}>
            Research Summary
          </h4>
          <ul className="text-sm space-y-1">
            <li className={progressPercent === 100 ? 'text-emerald-700' : 'text-slate-600'}>
              • {completedCount} of {TOTAL_STEPS} steps completed ({progressPercent}%)
            </li>
            {hasFlaggedItems && (
              <li className="text-red-600">
                • Flagged items require attention before proceeding
              </li>
            )}
            {progressPercent < 100 && !hasFlaggedItems && (
              <li className="text-slate-600">
                • {TOTAL_STEPS - completedCount} steps remaining to complete title research
              </li>
            )}
            {progressPercent === 100 && !hasFlaggedItems && (
              <li className="text-emerald-700 font-medium">
                • All title research complete — ready for bid decision
              </li>
            )}
          </ul>
        </div>

        {/* Legend */}
        <div className="text-xs text-slate-500 pt-4 border-t border-slate-200">
          <p className="font-medium mb-2">Expert Investor Title Research Methodology:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <span>1. Drive-by verification</span>
            <span>2. County deed search</span>
            <span>3. Grantor/Grantee chain</span>
            <span>4. Municipal liens</span>
            <span>5. Owner lien search</span>
            <span>6. HOA status</span>
            <span>7. ARV verification</span>
            <span>8. GIS/parcel verify</span>
            <span>9. Lawsuit search</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
