'use client'

import { AlertTriangle, CheckCircle, XCircle, AlertCircle, Search, Shield } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/ui-utils'
import type { RedemptionRiskResult, TooGoodResult } from '@/lib/scoring'

interface RiskIndicatorsProps {
  redemptionRisk: RedemptionRiskResult | null
  tooGoodToBeTrue: TooGoodResult | null
  className?: string
}

function RedemptionRiskDisplay({ risk }: { risk: RedemptionRiskResult }) {
  const getColorForLevel = (level: string) => {
    switch (level) {
      case 'LOW': return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', icon: 'text-emerald-600' }
      case 'MEDIUM': return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: 'text-amber-600' }
      case 'HIGH': return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: 'text-red-600' }
      default: return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-800', icon: 'text-gray-600' }
    }
  }

  const colors = getColorForLevel(risk.level)

  const getIconForLevel = (level: string) => {
    switch (level) {
      case 'LOW': return CheckCircle
      case 'MEDIUM': return AlertCircle
      case 'HIGH': return XCircle
      default: return AlertCircle
    }
  }

  const Icon = getIconForLevel(risk.level)

  return (
    <div className={cn(
      'rounded-lg border p-4',
      colors.bg,
      colors.border
    )}>
      <div className="flex items-start gap-3">
        <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', colors.icon)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className={cn('font-bold text-sm', colors.text)}>
              Likelihood Owner Redeems
            </p>
            <Badge
              variant="outline"
              className={cn(
                'text-xs font-semibold',
                colors.bg,
                colors.text,
                colors.border
              )}
            >
              {risk.level} ({risk.percentage}%)
            </Badge>
          </div>

          {risk.factors.length > 0 && (
            <div className="mt-2 space-y-1">
              {risk.factors.slice(0, 2).map((factor, i) => (
                <p key={i} className={cn('text-xs', colors.text, 'opacity-90')}>
                  • {factor}
                </p>
              ))}
            </div>
          )}

          {risk.notes.length > 0 && (
            <div className="mt-2 pt-2 border-t border-black/5">
              {risk.notes.slice(0, 1).map((note, i) => (
                <p key={i} className={cn('text-xs italic', colors.text, 'opacity-75')}>
                  {note}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TooGoodToBeTrueDisplay({ result }: { result: TooGoodResult }) {
  if (!result.triggered) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
          <div>
            <p className="font-bold text-sm text-emerald-800">
              Standard Investment Profile
            </p>
            <p className="text-xs text-emerald-700 mt-1 opacity-90">
              No unusual warning signs detected. Proceed with standard due diligence.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const isHighSuspicion = result.severity === 'high_suspicion'
  const bgColor = isHighSuspicion ? 'bg-red-50' : 'bg-amber-50'
  const borderColor = isHighSuspicion ? 'border-red-200' : 'border-amber-200'
  const textColor = isHighSuspicion ? 'text-red-800' : 'text-amber-800'
  const iconColor = isHighSuspicion ? 'text-red-600' : 'text-amber-600'

  return (
    <div className={cn(
      'rounded-lg border p-4',
      bgColor,
      borderColor
    )}>
      <div className="flex items-start gap-3">
        <AlertTriangle className={cn('w-5 h-5 shrink-0 mt-0.5', iconColor)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className={cn('font-bold text-sm', textColor)}>
              Why Would Nobody Buy This?
            </p>
            {isHighSuspicion && (
              <Badge variant="destructive" className="text-xs">
                HIGH SUSPICION
              </Badge>
            )}
          </div>

          <p className={cn('text-xs mt-2', textColor, 'opacity-90')}>
            {result.summary}
          </p>

          {result.triggers.length > 0 && (
            <div className="mt-3 space-y-1">
              {result.triggers.map((trigger, i) => (
                <div
                  key={i}
                  className={cn(
                    'text-xs p-2 rounded',
                    trigger.severity === 'critical'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-amber-100 text-amber-800'
                  )}
                >
                  <span className="font-medium">{trigger.message}</span>
                  {trigger.details && (
                    <span className="block mt-0.5 opacity-75">{trigger.details}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {result.checklist.length > 0 && (
            <div className="mt-3 pt-3 border-t border-black/5">
              <p className={cn('text-xs font-semibold mb-2', textColor)}>
                Investigation Checklist:
              </p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {result.checklist.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Search className="w-3 h-3 shrink-0 mt-0.5 opacity-50" />
                    <p className={cn('text-xs', textColor, 'opacity-80')}>
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function RiskIndicators({ redemptionRisk, tooGoodToBeTrue, className }: RiskIndicatorsProps) {
  const hasContent = redemptionRisk || (tooGoodToBeTrue?.triggered)

  if (!hasContent) {
    return null
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-gray-600">
          Risk Analysis
        </CardTitle>
        <CardDescription>
          Redemption likelihood and warning indicators
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {redemptionRisk && (
          <RedemptionRiskDisplay risk={redemptionRisk} />
        )}

        {tooGoodToBeTrue && (
          <TooGoodToBeTrueDisplay result={tooGoodToBeTrue} />
        )}
      </CardContent>
    </Card>
  )
}

export function RedemptionRiskBadge({ level, percentage }: { level: string; percentage: number }) {
  const getColor = () => {
    switch (level) {
      case 'LOW': return 'bg-emerald-100 text-emerald-800 border-emerald-300'
      case 'MEDIUM': return 'bg-amber-100 text-amber-800 border-amber-300'
      case 'HIGH': return 'bg-red-100 text-red-800 border-red-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  return (
    <Badge variant="outline" className={cn('text-xs font-medium', getColor())}>
      Redeem: {level} ({percentage}%)
    </Badge>
  )
}

export function TooGoodIndicator({ triggered, severity }: { triggered: boolean; severity: string }) {
  if (!triggered) {
    return (
      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
        ✓ Standard
      </Badge>
    )
  }

  if (severity === 'high_suspicion') {
    return (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
        ⚠ Investigate
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
      ? Check Data
    </Badge>
  )
}

export function RiskSummaryBar({
  redemptionRisk,
  tooGoodResult
}: {
  redemptionRisk: RedemptionRiskResult | null
  tooGoodResult: TooGoodResult | null
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {redemptionRisk && (
        <RedemptionRiskBadge
          level={redemptionRisk.level}
          percentage={redemptionRisk.percentage}
        />
      )}
      {tooGoodResult && (
        <TooGoodIndicator
          triggered={tooGoodResult.triggered}
          severity={tooGoodResult.severity}
        />
      )}
    </div>
  )
}
