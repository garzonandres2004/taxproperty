import { AlertTriangle, Info, CheckCircle2, MapPin, Home, Building2, TreePine } from 'lucide-react'
import { cn } from '@/lib/ui-utils'

interface PropertyAlertProps {
  type: 'micro-parcel' | 'entity-owned' | 'city-zoning' | 'tax-sanity' | 'absentee-owner' | 'assemblage' | 'high-risk'
  message: string
  details?: string
  className?: string
}

export function PropertyAlert({ type, message, details, className }: PropertyAlertProps) {
  const configs = {
    'micro-parcel': {
      icon: AlertTriangle,
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-800',
      iconColor: 'text-amber-600',
      title: 'Micro-Parcel Warning'
    },
    'entity-owned': {
      icon: Building2,
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      iconColor: 'text-blue-600',
      title: 'Entity Owned'
    },
    'city-zoning': {
      icon: MapPin,
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-800',
      iconColor: 'text-orange-600',
      title: 'City Zoning - Manual Verification Required'
    },
    'tax-sanity': {
      icon: AlertTriangle,
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      iconColor: 'text-red-600',
      title: 'Tax Amount Anomaly'
    },
    'absentee-owner': {
      icon: Home,
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-800',
      iconColor: 'text-emerald-600',
      title: 'Absentee Owner - Lower Redemption Risk'
    },
    'assemblage': {
      icon: TreePine,
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-800',
      iconColor: 'text-purple-600',
      title: 'Assemblage Opportunity'
    },
    'high-risk': {
      icon: AlertTriangle,
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      iconColor: 'text-red-600',
      title: 'High Risk Factors'
    }
  }

  const config = configs[type]
  const Icon = config.icon

  return (
    <div className={cn(
      'rounded-lg p-4 border flex items-start gap-3',
      config.bg,
      config.border,
      className
    )}>
      <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', config.iconColor)} />
      <div>
        <p className={cn('font-bold text-sm', config.text)}>
          {config.title}
        </p>
        <p className={cn('text-sm mt-1 opacity-90', config.text)}>
          {message}
        </p>
        {details && (
          <p className={cn('text-xs mt-2 opacity-75', config.text)}>
            {details}
          </p>
        )}
      </div>
    </div>
  )
}

interface ScoreBadgeProps {
  score: number | null
  type: 'opportunity' | 'risk' | 'final'
  size?: 'sm' | 'md' | 'lg'
}

export function ScoreBadge({ score, type, size = 'md' }: ScoreBadgeProps) {
  if (score === null) return <span className="text-gray-400">-</span>

  const getColor = () => {
    if (type === 'opportunity' || type === 'final') {
      if (score >= 75) return 'bg-emerald-100 text-emerald-700 border-emerald-300'
      if (score >= 55) return 'bg-amber-100 text-amber-700 border-amber-300'
      return 'bg-red-100 text-red-700 border-red-300'
    } else {
      // risk score - lower is better
      if (score <= 30) return 'bg-emerald-100 text-emerald-700 border-emerald-300'
      if (score <= 50) return 'bg-amber-100 text-amber-700 border-amber-300'
      return 'bg-red-100 text-red-700 border-red-300'
    }
  }

  const getLabel = () => {
    if (type === 'opportunity') {
      if (score >= 75) return 'Strong'
      if (score >= 55) return 'Moderate'
      return 'Weak'
    } else if (type === 'risk') {
      if (score <= 30) return 'Low'
      if (score <= 50) return 'Medium'
      return 'High'
    } else {
      if (score >= 75) return 'Strong Buy'
      if (score >= 55) return 'Consider'
      return 'Avoid'
    }
  }

  const sizes = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  }

  return (
    <div className="flex items-center gap-2">
      <span className={cn(
        'inline-flex items-center font-bold rounded-full border',
        getColor(),
        sizes[size]
      )}>
        {Math.round(score)}
      </span>
      <span className="text-xs text-gray-500 font-medium">
        {getLabel()}
      </span>
    </div>
  )
}

interface RecommendationBadgeProps {
  recommendation: string | null
  showLabel?: boolean
}

export function RecommendationBadge({ recommendation, showLabel = true }: RecommendationBadgeProps) {
  if (!recommendation) return null

  const configs = {
    bid: {
      bg: 'bg-emerald-100',
      border: 'border-emerald-300',
      text: 'text-emerald-800',
      icon: CheckCircle2,
      label: 'BID',
      description: 'Strong opportunity'
    },
    research_more: {
      bg: 'bg-amber-100',
      border: 'border-amber-300',
      text: 'text-amber-800',
      icon: Info,
      label: 'RESEARCH',
      description: 'Needs more investigation'
    },
    avoid: {
      bg: 'bg-red-100',
      border: 'border-red-300',
      text: 'text-red-800',
      icon: AlertTriangle,
      label: 'AVOID',
      description: 'High risk or low opportunity'
    }
  }

  const config = configs[recommendation as keyof typeof configs] || configs.avoid
  const Icon = config.icon

  return (
    <div className={cn(
      'rounded-lg p-3 border flex items-center gap-3',
      config.bg,
      config.border
    )}>
      <Icon className={cn('w-5 h-5', config.text)} />
      <div>
        <p className={cn('font-bold text-lg', config.text)}>
          {config.label}
        </p>
        {showLabel && (
          <p className={cn('text-xs opacity-75', config.text)}>
            {config.description}
          </p>
        )}
      </div>
    </div>
  )
}

interface DataConfidenceIndicatorProps {
  confidence: number | null
}

export function DataConfidenceIndicator({ confidence }: DataConfidenceIndicatorProps) {
  if (!confidence) return null

  const getColor = () => {
    if (confidence >= 70) return 'bg-emerald-500'
    if (confidence >= 40) return 'bg-amber-500'
    return 'bg-red-500'
  }

  const getLabel = () => {
    if (confidence >= 70) return 'High Confidence'
    if (confidence >= 40) return 'Medium Confidence'
    return 'Low Confidence'
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden max-w-[100px]">
        <div
          className={cn('h-full transition-all', getColor())}
          style={{ width: `${confidence}%` }}
        />
      </div>
      <span className="text-gray-500 font-medium whitespace-nowrap">
        {getLabel()} ({Math.round(confidence)}%)
      </span>
    </div>
  )
}

// Helper to generate property alerts based on data
export function generatePropertyAlerts(property: any) {
  const alerts: Array<{ type: PropertyAlertProps['type'], message: string, details?: string }> = []

  // Micro-parcel detection
  if (property.micro_parcel) {
    const isExtreme = property.lot_size_sqft && property.lot_size_sqft < 500
    alerts.push({
      type: 'micro-parcel',
      message: isExtreme
        ? 'This parcel is extremely small (<500 sq ft) and likely unbuildable as a standalone lot.'
        : `This parcel is small (${Math.round(property.lot_size_sqft)} sq ft). May require assemblage with adjacent parcels for development.`,
      details: isExtreme
        ? 'Recommendation: Avoid unless part of larger assemblage deal'
        : 'Check adjacent parcels for potential assemblage opportunity'
    })
  }

  // Entity-owned detection
  if (property.owner_name && /LLC|CITY|HOA|ASSOC|CORP|INC/i.test(property.owner_name)) {
    alerts.push({
      type: 'entity-owned',
      message: `Owned by ${property.owner_name.substring(0, 40)}...`,
      details: 'Entity-owned properties may have complex title issues or legal protections. Extra due diligence recommended.'
    })
  }

  // Absentee owner (positive indicator)
  if (property.absentee_owner) {
    alerts.push({
      type: 'absentee-owner',
      message: 'Owner mailing address differs from property location',
      details: 'Absentee owners typically have lower redemption rates after sale'
    })
  }

  // Assemblage opportunity
  if (property.assemblage_opportunity) {
    const adjacentCount = property.adjacent_parcels?.length || 0
    const taxSaleCount = property.adjacent_parcels?.filter((p: any) => p.is_in_tax_sale).length || 0

    alerts.push({
      type: 'assemblage',
      message: taxSaleCount > 0
        ? `Assemblage opportunity: ${taxSaleCount} adjacent parcel${taxSaleCount > 1 ? 's' : ''} in tax sale`
        : 'Adjacent parcels may enable larger development',
      details: taxSaleCount > 0
        ? `${taxSaleCount} of ${adjacentCount} adjacent parcel${adjacentCount > 1 ? 's are' : ' is'} also in the tax sale - potential combined acquisition opportunity`
        : `${adjacentCount} adjacent parcel${adjacentCount > 1 ? 's found' : ' found'} - research neighboring properties for potential combined acquisition`
    })
  }

  // Tax sanity check
  if (property.total_amount_due && property.estimated_market_value) {
    const taxRatio = (property.total_amount_due / property.estimated_market_value) * 100
    if (taxRatio < 0.5) {
      alerts.push({
        type: 'tax-sanity',
        message: `Tax amount (${taxRatio.toFixed(2)}% of market value) seems unusually low`,
        details: 'This may indicate special exemptions, partial payments, or data errors. Verify with county.'
      })
    }
  }

  // High risk score
  if (property.risk_score && property.risk_score > 70) {
    alerts.push({
      type: 'high-risk',
      message: `Risk score of ${Math.round(property.risk_score)} indicates multiple risk factors`,
      details: 'Review title, access, and legal risks before proceeding'
    })
  }

  return alerts
}
