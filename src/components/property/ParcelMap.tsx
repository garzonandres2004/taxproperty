'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Map, ExternalLink, Layers, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cleanHtmlEntities } from '@/lib/ui-utils'

interface ParcelMapProps {
  parcelNumber: string
  address?: string | null
}

/**
 * Parcel Map Component - Shows parcel boundaries via Utah County GIS
 * Uses Utah County Land Records for direct parcel lookup
 * OpenStreetMap for general location fallback
 */
export function ParcelMap({ parcelNumber, address }: ParcelMapProps) {
  // Normalize parcel number for Utah County GIS
  // Utah County expects format like: 30600016001 (11 digits, no colons)
  const normalizeParcelId = (parcel: string): string => {
    // Remove colons and pad with zeros to 11 characters
    const clean = parcel.replace(/:/g, '')
    return clean.padStart(11, '0')
  }

  const normalizedParcelId = normalizeParcelId(parcelNumber)

  // Utah County URLs - Updated April 2025
  // Parcel Map: Main GIS viewer (NEW correct URL)
  const utahCountyParcelMapUrl = 'https://maps.utahcounty.gov/ParcelMap/ParcelMap.html'
  // Land Records: Direct parcel lookup by serial number
  const utahCountyLandRecordsUrl = `https://www.utahcounty.gov/LandRecords/Property.asp?av_serial=${normalizedParcelId}`

  // OpenStreetMap embed (fallback) - uses Nominatim search
  const getOsmUrl = () => {
    if (!address) return null
    // Clean HTML entities before encoding for URL
    const cleanAddress = cleanHtmlEntities(address)
    const query = encodeURIComponent(`${cleanAddress}, Utah County, Utah`)
    return `https://www.openstreetmap.org/search?query=${query}`
  }

  const osmUrl = getOsmUrl()

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-slate-100 flex items-center gap-2">
          <Map className="h-5 w-5 text-green-400" />
          Parcel Map
        </CardTitle>
        <CardDescription className="text-slate-400">
          County GIS parcel boundaries and records
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Alert className="bg-slate-700 border-slate-600">
            <Info className="h-4 w-4 text-blue-400" />
            <AlertDescription className="text-slate-300 text-sm ml-2">
              Search Parcel ID <span className="font-mono font-bold text-slate-200">{normalizedParcelId}</span> in the Parcel Map for boundaries and aerial imagery.
            </AlertDescription>
          </Alert>

          <div className="flex flex-col gap-3">
            {/* Primary: Utah County Parcel Map (GIS) */}
            <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              <a
                href={utahCountyParcelMapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2"
              >
                <Map className="h-4 w-4" />
                Utah County Parcel Map
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>

            {/* Secondary: Land Records - Property Lookup */}
            <Button variant="outline" asChild className="w-full border-slate-600 text-slate-300 hover:bg-slate-700">
              <a
                href={utahCountyLandRecordsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2"
              >
                <Layers className="h-4 w-4" />
                Land Records (Direct Lookup)
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>

            {/* Tertiary: OpenStreetMap for general location */}
            {osmUrl && (
              <Button variant="outline" asChild className="w-full border-slate-600 text-slate-300 hover:bg-slate-700">
                <a
                  href={osmUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  OpenStreetMap
                </a>
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-700">
            <span className="text-xs text-slate-500">Parcel ID:</span>
            <Badge variant="outline" className="border-slate-600 text-slate-400 font-mono text-xs">
              {normalizedParcelId}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
