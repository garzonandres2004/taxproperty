'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  MapPin,
  ExternalLink,
  Map,
  Layers,
  Maximize2,
  Image as ImageIcon,
  Loader2
} from 'lucide-react'
import { cleanHtmlEntities } from '@/lib/ui-utils'

interface PropertyImageHeroProps {
  address: string | null
  parcelNumber: string
  photoUrl?: string | null
  zillowUrl?: string | null
  latitude?: number | null
  longitude?: number | null
}

export function PropertyImageHero({
  address,
  parcelNumber,
  photoUrl,
  zillowUrl,
  latitude,
  longitude
}: PropertyImageHeroProps) {
  const [showInteractive, setShowInteractive] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  // Normalize parcel number
  const normalizeParcelId = (parcel: string): string => {
    const clean = parcel.replace(/:/g, '')
    return clean.padStart(11, '0')
  }
  const normalizedParcelId = normalizeParcelId(parcelNumber)

  // Determine image source priority
  const hasPhotoUrl = !!photoUrl
  const hasCoordinates = !!(latitude && longitude)

  // Generate Street View Static URL if coordinates available
  const getStreetViewStaticUrl = () => {
    if (!latitude || !longitude) return null
    // Use the existing photo_url if it's from Street View
    if (photoUrl?.includes('streetview')) return photoUrl
    return photoUrl // Fall back to whatever photo_url we have
  }

  const staticImageUrl = getStreetViewStaticUrl()

  // External URLs
  const googleMapsUrl = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : latitude && longitude
      ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
      : null

  const googleMapsEmbedUrl = address
    ? `https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=m&z=18&ie=UTF8&iwloc=&output=embed`
    : null

  const utahCountyParcelMapUrl = 'https://maps.utahcounty.gov/ParcelMap/ParcelMap.html'
  const utahCountyLandRecordsUrl = `https://www.utahcounty.gov/LandRecords/Property.asp?av_serial=${normalizedParcelId}`

  const handleImageLoad = () => {
    setIsLoading(false)
    setHasError(false)
  }

  const handleImageError = () => {
    setIsLoading(false)
    setHasError(true)
  }

  return (
    <Card className="bg-slate-800 border-slate-700 overflow-hidden">
      <CardContent className="p-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-400" />
              Property Visual
            </h3>
            {address && (
              <p className="text-sm text-slate-400 hidden md:block truncate max-w-[300px]" title={address}>
                {address}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle between Static and Interactive */}
            {staticImageUrl && (
              <div className="flex items-center bg-slate-700 rounded-lg p-1">
                <Button
                  variant={!showInteractive ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setShowInteractive(false)}
                  className={!showInteractive ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}
                >
                  <ImageIcon className="h-4 w-4 mr-1" />
                  Photo
                </Button>
                <Button
                  variant={showInteractive ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setShowInteractive(true)}
                  className={showInteractive ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}
                >
                  <Map className="h-4 w-4 mr-1" />
                  Interactive
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Main Image Area */}
        <div className="relative w-full aspect-[16/9] bg-slate-900">
          {showInteractive && googleMapsEmbedUrl ? (
            // Interactive Map Mode
            <>
              <iframe
                src={googleMapsEmbedUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`Property location - ${parcelNumber}`}
                className="absolute inset-0"
              />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <Badge
                  variant="outline"
                  className="bg-slate-900/80 border-slate-600 text-slate-300 backdrop-blur-sm"
                >
                  Interactive Map
                </Badge>
                {googleMapsUrl && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-slate-900/80 backdrop-blur-sm text-white border-0 hover:bg-slate-800"
                    asChild
                  >
                    <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                      <Maximize2 className="h-4 w-4" />
                      Full View
                    </a>
                  </Button>
                )}
              </div>
            </>
          ) : staticImageUrl ? (
            // Static High-Quality Image Mode
            <>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                  <Loader2 className="h-8 w-8 text-slate-600 animate-spin" />
                </div>
              )}
              <img
                src={staticImageUrl}
                alt={`Property view - ${parcelNumber}`}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
              {!isLoading && !hasError && (
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className="bg-slate-900/80 border-slate-600 text-slate-300 backdrop-blur-sm"
                  >
                    Street View Photo
                  </Badge>
                  {googleMapsUrl && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="bg-slate-900/80 backdrop-blur-sm text-white border-0 hover:bg-slate-800"
                      asChild
                    >
                      <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                        <Maximize2 className="h-4 w-4" />
                        Open in Maps
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </>
          ) : googleMapsEmbedUrl ? (
            // Fallback to embed if no static image
            <>
              <iframe
                src={googleMapsEmbedUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`Property location - ${parcelNumber}`}
                className="absolute inset-0"
              />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <Badge
                  variant="outline"
                  className="bg-slate-900/80 border-slate-600 text-slate-300 backdrop-blur-sm"
                >
                  Map Location
                </Badge>
                {googleMapsUrl && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-slate-900/80 backdrop-blur-sm text-white border-0 hover:bg-slate-800"
                    asChild
                  >
                    <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                      <Maximize2 className="h-4 w-4" />
                      Full View
                    </a>
                  </Button>
                )}
              </div>
            </>
          ) : (
            // No visual available
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-8">
                <MapPin className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500 mb-4">No visual available for this property</p>
                <p className="text-slate-600 text-sm font-mono">{parcelNumber}</p>
              </div>
            </div>
          )}
        </div>

        {/* Action Bar */}
        <div className="p-4 bg-slate-900/50 border-t border-slate-700">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">
              Open in:
            </span>

            {googleMapsUrl && (
              <Button
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                asChild
              >
                <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-400" />
                  Google Maps
                </a>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
              asChild
            >
              <a
                href={utahCountyParcelMapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <Map className="h-4 w-4 text-green-400" />
                Parcel Map
              </a>
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
              asChild
            >
              <a
                href={utahCountyLandRecordsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <Layers className="h-4 w-4 text-amber-400" />
                Land Records
              </a>
            </Button>

            {zillowUrl && (
              <Button
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                asChild
              >
                <a
                  href={zillowUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4 text-blue-500" />
                  Zillow
                </a>
              </Button>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Parcel ID: <span className="font-mono text-slate-400">{normalizedParcelId}</span>
            </p>
            {address && (
              <p className="text-xs text-slate-500 truncate max-w-[50%]" title={address}>
                {cleanHtmlEntities(address)}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
