'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  MapPin,
  ExternalLink,
  Map,
  Layers,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Image as ImageIcon,
  Video,
  RotateCw
} from 'lucide-react'
import { cleanHtmlEntities } from '@/lib/ui-utils'

interface ZillowStyleImageHeroProps {
  address: string | null
  parcelNumber: string
  photoUrl?: string | null
  zillowUrl?: string | null
  latitude?: number | null
  longitude?: number | null
}

export function ZillowStyleImageHero({
  address,
  parcelNumber,
  photoUrl,
  zillowUrl,
  latitude,
  longitude
}: ZillowStyleImageHeroProps) {
  const [activeTab, setActiveTab] = useState<'street' | 'map'>('street')
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  // Generate high-quality Street View Static URL
  const getStreetViewUrl = () => {
    if (latitude && longitude && apiKey) {
      // Use coordinates for precise location
      return `https://maps.googleapis.com/maps/api/streetview?size=1600x900&location=${latitude},${longitude}&fov=90&heading=0&pitch=0&key=${apiKey}`
    }
    if (address && apiKey) {
      // Fallback to address-based
      return `https://maps.googleapis.com/maps/api/streetview?size=1600x900&location=${encodeURIComponent(address)}&fov=90&heading=0&pitch=0&key=${apiKey}`
    }
    return photoUrl || null
  }

  const streetViewUrl = getStreetViewUrl()

  // Generate Map Static URL (satellite view)
  const getMapUrl = () => {
    if (latitude && longitude && apiKey) {
      return `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=18&size=1600x900&maptype=satellite&markers=color:red%7C${latitude},${longitude}&key=${apiKey}`
    }
    if (address && apiKey) {
      return `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(address)}&zoom=18&size=1600x900&maptype=satellite&key=${apiKey}`
    }
    return null
  }

  const mapUrl = getMapUrl()

  // Get current image based on tab
  const currentImageUrl = activeTab === 'street' ? streetViewUrl : mapUrl

  // External URLs
  const googleMapsUrl = latitude && longitude
    ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    : address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
      : null

  const utahCountyParcelUrl = `https://maps.utahcounty.gov/ParcelMap/ParcelMap.html`
  const landRecordsUrl = `https://www.utahcounty.gov/LandRecords/Property.asp?av_serial=${parcelNumber.replace(/:/g, '').padStart(11, '0')}`

  const handleImageLoad = () => {
    setIsLoading(false)
    setHasError(false)
  }

  const handleImageError = () => {
    setIsLoading(false)
    setHasError(true)
  }

  return (
    <div className="w-full bg-white rounded-lg overflow-hidden shadow-sm border border-slate-200">
      {/* Main Image Container - Zillow Style */}
      <div className="relative w-full aspect-[16/9] bg-slate-100">
        {/* Loading State */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
            <div className="animate-pulse flex flex-col items-center">
              <RotateCw className="h-8 w-8 text-slate-400 animate-spin mb-2" />
              <span className="text-sm text-slate-400">Loading view...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 mb-2">View not available</p>
              <p className="text-slate-400 text-sm">{parcelNumber}</p>
            </div>
          </div>
        )}

        {/* Main Image */}
        {currentImageUrl && (
          <img
            src={currentImageUrl}
            alt={`${activeTab === 'street' ? 'Street View' : 'Map View'} of ${cleanHtmlEntities(address || parcelNumber)}`}
            className={`w-full h-full object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )}

        {/* Top Left - Status Badge */}
        <div className="absolute top-4 left-4">
          <span className="inline-flex items-center px-3 py-1.5 bg-white/90 backdrop-blur-sm text-slate-800 text-sm font-medium rounded-md shadow-sm">
            Off market
          </span>
        </div>

        {/* Bottom Left - View Type Label */}
        <div className="absolute bottom-4 left-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1.5 bg-black/70 backdrop-blur-sm text-white text-sm rounded-md">
              <MapPin className="h-4 w-4 mr-1.5" />
              {activeTab === 'street' ? 'Street View' : 'Map View'}
            </span>
          </div>
        </div>

        {/* Bottom Right - Expand Button */}
        {googleMapsUrl && (
          <div className="absolute bottom-4 right-4">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-1.5 bg-black/70 backdrop-blur-sm text-white text-sm rounded-md hover:bg-black/80 transition-colors"
            >
              <Maximize2 className="h-4 w-4 mr-1.5" />
              Full View
            </a>
          </div>
        )}

        {/* Navigation Arrows (decorative, like Zillow) */}
        {currentImageUrl && (
          <>
            <button className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-slate-700 hover:bg-white transition-colors shadow-md">
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-slate-700 hover:bg-white transition-colors shadow-md">
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      {/* Tab Navigation - Zillow Style */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('street')}
          className={`flex items-center px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'street'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <ImageIcon className="h-4 w-4 mr-2" />
          Street View
        </button>
        <button
          onClick={() => setActiveTab('map')}
          className={`flex items-center px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'map'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Map className="h-4 w-4 mr-2" />
          Map
        </button>
      </div>

      {/* Action Bar - Clean and minimal */}
      <div className="p-4 bg-slate-50 border-t border-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          {googleMapsUrl && (
            <Button
              variant="outline"
              size="sm"
              className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
              asChild
            >
              <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-500" />
                Open in Maps
              </a>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
            asChild
          >
            <a href={utahCountyParcelUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-green-600" />
              Parcel Map
            </a>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
            asChild
          >
            <a href={landRecordsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-amber-600" />
              Land Records
            </a>
          </Button>

          {zillowUrl && (
            <Button
              variant="outline"
              size="sm"
              className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 ml-auto"
              asChild
            >
              <a href={zillowUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-blue-500" />
                View on Zillow
              </a>
            </Button>
          )}
        </div>

        {/* Property Info Bar */}
        <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-500">
              Parcel: <span className="font-mono text-slate-700">{parcelNumber}</span>
            </span>
            {address && (
              <span className="text-slate-500 truncate max-w-[300px]">
                {cleanHtmlEntities(address)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
