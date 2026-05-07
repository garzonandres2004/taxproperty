'use client'

import { useState, useEffect } from 'react'
import { Camera, Home, TreePine, Building2, ImageOff, Map } from 'lucide-react'
import { cn } from '@/lib/ui-utils'

const GMAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

interface PropertyImageProps {
  address: string | null
  parcelNumber: string
  propertyType?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
  photoUrl?: string | null
  latitude?: number | null
  longitude?: number | null
}

function buildStreetViewUrl(lat: number, lng: number): string {
  return `https://maps.googleapis.com/maps/api/streetview?size=400x300&location=${lat},${lng}&fov=80&pitch=0&key=${GMAPS_KEY}`
}

function buildStaticMapUrl(lat: number, lng: number): string {
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=17&size=400x300&maptype=satellite&markers=color:red%7C${lat},${lng}&key=${GMAPS_KEY}`
}

export function PropertyImage({
  address,
  parcelNumber,
  propertyType = 'unknown',
  size = 'md',
  className,
  photoUrl,
  latitude,
  longitude,
}: PropertyImageProps) {
  const [streetViewError, setStreetViewError] = useState(false)
  const [staticMapError, setStaticMapError] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  }

  const iconSize = size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-5 h-5' : 'w-6 h-6'

  // Derive the best available image URL
  const streetViewUrl = photoUrl || (latitude && longitude && GMAPS_KEY ? buildStreetViewUrl(latitude, longitude) : null)
  const staticMapUrl = latitude && longitude && GMAPS_KEY ? buildStaticMapUrl(latitude, longitude) : null
  const hasCoords = !!(latitude && longitude)

  const getIcon = () => {
    switch (propertyType?.toLowerCase()) {
      case 'single_family':
      case 'condo':
        return <Home className={cn('text-slate-400', iconSize)} />
      case 'vacant_land':
        return <TreePine className={cn('text-emerald-400', iconSize)} />
      case 'commercial':
      case 'multifamily':
        return <Building2 className={cn('text-blue-400', iconSize)} />
      default:
        return <Camera className={cn('text-slate-400', iconSize)} />
    }
  }

  if (!mounted) {
    return (
      <div className={cn(sizeClasses[size], 'rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center', className)}>
        {getIcon()}
      </div>
    )
  }

  // Try Street View first
  if (streetViewUrl && !streetViewError) {
    return (
      <div className={cn(sizeClasses[size], 'rounded-lg overflow-hidden border border-slate-200 relative group', className)}>
        <img
          src={streetViewUrl}
          alt={`Street view of ${parcelNumber}`}
          className="w-full h-full object-cover"
          onError={() => setStreetViewError(true)}
          loading="lazy"
        />
        {size !== 'sm' && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-[8px] text-white text-center py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            Street View
          </div>
        )}
      </div>
    )
  }

  // Fallback: static satellite map
  if (staticMapUrl && !staticMapError && hasCoords) {
    return (
      <div className={cn(sizeClasses[size], 'rounded-lg overflow-hidden border border-slate-200 relative group', className)}>
        <img
          src={staticMapUrl}
          alt={`Map of ${parcelNumber}`}
          className="w-full h-full object-cover"
          onError={() => setStaticMapError(true)}
          loading="lazy"
        />
        {size !== 'sm' && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-[8px] text-white text-center py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            Satellite
          </div>
        )}
      </div>
    )
  }

  // Final fallback: icon with property type indicator
  return (
    <div
      className={cn(
        sizeClasses[size],
        'rounded-lg border border-slate-200 flex flex-col items-center justify-center bg-slate-50',
        className
      )}
      title={`${propertyType?.replace('_', ' ') || 'Property'} — ${parcelNumber}${hasCoords ? ' (no imagery)' : ' (no coords)'}`}
    >
      {hasCoords ? (
        <Map className={cn(iconSize, 'text-slate-300')} />
      ) : (
        <ImageOff className={cn(iconSize, 'text-slate-300')} />
      )}
      {size !== 'sm' && (
        <span className="text-[8px] text-slate-400 text-center leading-tight px-1 mt-0.5">
          {hasCoords ? 'No imagery' : 'No image'}
        </span>
      )}
    </div>
  )
}

// Utah County Parcel Map Image Component — Utah County only
export function ParcelMapImage({
  parcelNumber,
  size = 'md',
  className,
}: {
  parcelNumber: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  }

  const parcelMapUrl = `https://maps.utahcounty.gov/ParcelMap/ParcelMap?parcel=${parcelNumber}`

  return (
    <a
      href={parcelMapUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        sizeClasses[size],
        'rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors group',
        className
      )}
      title="View on Utah County Parcel Map"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size === 'sm' ? 16 : size === 'md' ? 20 : 24}
        height={size === 'sm' ? 16 : size === 'md' ? 20 : 24}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-slate-400 group-hover:text-emerald-600 transition-colors"
      >
        <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
        <line x1="9" y1="3" x2="9" y2="18" />
        <line x1="15" y1="6" x2="15" y2="21" />
      </svg>
    </a>
  )
}
