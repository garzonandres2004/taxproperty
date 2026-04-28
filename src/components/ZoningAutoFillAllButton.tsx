'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Loader2, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'

interface AutoFillResult {
  success: boolean
  propertyId: string
  parcelNumber: string
  address?: string
  city?: string
  isUnincorporated?: boolean
  marketValueUpdated?: boolean
  error?: string
}

interface SummaryStats {
  total: number
  marketValuesUpdated: number
  unincorporatedCount: number
  cityCount: number
  errors: number
}

export default function ZoningAutoFillAllButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentProperty, setCurrentProperty] = useState<string>('')
  const [results, setResults] = useState<AutoFillResult[]>([])
  const [summary, setSummary] = useState<SummaryStats | null>(null)
  const [showSummary, setShowSummary] = useState(false)

  const handleOpen = () => {
    setIsOpen(true)
    setShowSummary(false)
    setResults([])
    setSummary(null)
    setProgress(0)
    setCurrentProperty('')
  }

  const handleConfirm = async () => {
    setIsProcessing(true)
    setResults([])

    try {
      // Fetch all properties
      const response = await fetch('/api/properties')
      if (!response.ok) {
        throw new Error('Failed to fetch properties')
      }
      const properties = await response.json()

      const total = properties.length
      const processedResults: AutoFillResult[] = []
      let marketValuesUpdated = 0
      let unincorporatedCount = 0
      let cityCount = 0
      let errors = 0

      for (let i = 0; i < properties.length; i++) {
        const property = properties[i]
        setProgress(Math.round(((i + 1) / total) * 100))
        setCurrentProperty(`${property.city || 'Unknown'}, ${property.parcel_number}`)

        try {
          const autoFillResponse = await fetch(
            `/api/properties/${property.id}/zoning/auto-fill`,
            { method: 'POST' }
          )

          if (!autoFillResponse.ok) {
            throw new Error(`Auto-fill failed: ${autoFillResponse.statusText}`)
          }

          const result = await autoFillResponse.json()

          // Check if market value was updated
          const marketValueUpdated = result.results?.stepsCompleted?.some(
            (step: string) => step.includes('Updated market value')
          )
          if (marketValueUpdated) marketValuesUpdated++

          // Check jurisdiction
          const isUnincorporated = result.results?.data?.isUnincorporated
          if (isUnincorporated) {
            unincorporatedCount++
          } else {
            cityCount++
          }

          processedResults.push({
            success: true,
            propertyId: property.id,
            parcelNumber: property.parcel_number,
            address: property.property_address,
            city: result.results?.data?.jurisdiction,
            isUnincorporated,
            marketValueUpdated
          })
        } catch (error) {
          errors++
          processedResults.push({
            success: false,
            propertyId: property.id,
            parcelNumber: property.parcel_number,
            address: property.property_address,
            error: (error as Error).message
          })
        }

        // Add delay to avoid rate limiting
        if (i < properties.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300))
        }
      }

      setResults(processedResults)
      setSummary({
        total,
        marketValuesUpdated,
        unincorporatedCount,
        cityCount,
        errors
      })
      setShowSummary(true)
    } catch (error) {
      console.error('Auto-fill all error:', error)
      setResults([{
        success: false,
        propertyId: 'batch',
        parcelNumber: 'N/A',
        error: (error as Error).message
      }])
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    if (!isProcessing) {
      setIsOpen(false)
      setShowSummary(false)
      setResults([])
      setSummary(null)
      setProgress(0)
      setCurrentProperty('')
      // Refresh the page to show updated data
      window.location.reload()
    }
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={handleOpen}
        className="gap-2"
      >
        <RefreshCw className="h-4 w-4" />
        Auto-fill Zoning (All)
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          {!showSummary ? (
            <>
              <DialogHeader>
                <DialogTitle>Auto-fill Zoning for All Properties</DialogTitle>
                <DialogDescription>
                  Run zoning auto-fill on all properties? This will fill in market values,
                  building data, and zoning info from AGRC. Takes about 2-3 minutes.
                </DialogDescription>
              </DialogHeader>

              {isProcessing ? (
                <div className="py-6 space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Processing {Math.round((progress / 100) * (results.length + (100 - progress) / 100 * results.length))} properties...
                    </span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-muted-foreground truncate">
                    {currentProperty}
                  </p>
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                </div>
              ) : (
                <DialogFooter className="mt-4">
                  <Button variant="outline" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleConfirm}>
                    Start Auto-fill
                  </Button>
                </DialogFooter>
              )}
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Auto-fill Complete
                </DialogTitle>
              </DialogHeader>

              <div className="py-4 space-y-4">
                <p className="text-lg font-medium">
                  {summary?.total} properties processed
                </p>

                <div className="space-y-2 text-sm">
                  {summary && summary.marketValuesUpdated > 0 && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>{summary.marketValuesUpdated} had market values updated from AGRC</span>
                    </div>
                  )}
                  {summary && summary.unincorporatedCount > 0 && (
                    <div className="flex items-center gap-2 text-blue-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>{summary.unincorporatedCount} are unincorporated (zone codes filled)</span>
                    </div>
                  )}
                  {summary && summary.cityCount > 0 && (
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertCircle className="h-4 w-4" />
                      <span>{summary.cityCount} are city jurisdiction (manual zoning needed)</span>
                    </div>
                  )}
                  {summary && summary.errors > 0 && (
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      <span>{summary.errors} errors</span>
                    </div>
                  )}
                </div>

                {results.some(r => !r.success) && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-red-600 mb-2">Errors:</p>
                    <div className="max-h-32 overflow-y-auto text-xs space-y-1">
                      {results.filter(r => !r.success).map((r, i) => (
                        <div key={i} className="text-red-600">
                          {r.parcelNumber}: {r.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button onClick={handleClose}>
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
