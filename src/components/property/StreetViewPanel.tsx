'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MapPin, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface StreetViewPanelProps {
  address: string | null
  parcelNumber: string
  photoUrl?: string | null
}

/**
 * Street View Panel - Google Maps embed for property street view
 * Uses address-based query for embed, with fallback to external link
 */
export function StreetViewPanel({ address, parcelNumber, photoUrl }: StreetViewPanelProps) {
  // Generate Google Maps embed URL using address query
  // Format: https://maps.google.com/maps?q={encoded_address}&t=m&z=14&ie=UTF8&iwloc=&output=embed
  const getEmbedUrl = () => {
    if (!address) return null
    const encodedAddress = encodeURIComponent(address)
    return `https://maps.google.com/maps?q=${encodedAddress}&t=m&z=18&ie=UTF8&iwloc=&output=embed`
  }

  // Generate Street View direct link (opens in new tab with full Google Maps)
  const getStreetViewUrl = () => {
    if (!address) {
      // Fallback to parcel search on Utah County
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Utah County parcel ${parcelNumber}`)}`
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
  }

  const embedUrl = getEmbedUrl()
  const streetViewUrl = getStreetViewUrl()

  // If we have no address, show a message with link to search
  if (!address) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-400" />
            Street View
          </CardTitle>
          <CardDescription className="text-slate-400">
            Google Maps street-level imagery
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="bg-slate-700 border-slate-600">
            <AlertDescription className="text-slate-300">
              No property address available. Use the link below to search manually.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button variant="outline" size="sm" asChild className="border-slate-600 text-slate-300 hover:bg-slate-700">
              <a href={streetViewUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Open Google Maps
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-slate-100 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-blue-400" />
          Street View
        </CardTitle>
        <CardDescription className="text-slate-400">
          Google Maps street-level imagery
        </CardDescription>
      </CardHeader>
      <CardContent>
        {embedUrl ? (
          <div className="space-y-3">
            <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-slate-600">
              <iframe
                src={embedUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`Street view of ${parcelNumber}`}
                className="absolute inset-0"
              />
            </div>
            <div className="flex justify-between items-center">
              <p className="text-xs text-slate-500 truncate max-w-[60%]" title={address}>
                {address}
              </p>
              <Button variant="outline" size="sm" asChild className="border-slate-600 text-slate-300 hover:bg-slate-700">
                <a href={streetViewUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Open in Maps
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <Alert className="bg-slate-700 border-slate-600">
            <AlertDescription className="text-slate-300">
              Unable to generate map embed. Click below to view on Google Maps.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
