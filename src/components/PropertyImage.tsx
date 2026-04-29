'use client'

import { useState, useEffect } from 'react'
import { Camera, Home, TreePine, Building2, ImageOff } from 'lucide-react'
import { cn } from '@/lib/ui-utils'

interface PropertyImageProps {
  address: string | null
  parcelNumber: string
  propertyType?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
  photoUrl?: string | null
}

export function PropertyImage({
  address,
  parcelNumber,
  propertyType = 'unknown',
  size = 'md',
  className,
  photoUrl,
}: PropertyImageProps) {
  const [error, setError] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Only render image on client to avoid SSR issues with onError
  useEffect(() => {
    setMounted(true)
  }, [])

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  }

  const imageUrl = photoUrl || null

  const getIcon = () => {
    switch (propertyType?.toLowerCase()) {
      case 'single_family':
      case 'condo':
        return <Home className={cn('text-slate-400', size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-5 h-5' : 'w-6 h-6')} />
      case 'vacant_land':
        return <TreePine className={cn('text-emerald-400', size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-5 h-5' : 'w-6 h-6')} />
      case 'commercial':
      case 'multifamily':
        return <Building2 className={cn('text-blue-400', size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-5 h-5' : 'w-6 h-6')} />
      default:
        return <Camera className={cn('text-slate-400', size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-5 h-5' : 'w-6 h-6')} />
    }
  }

  const getBgColor = () => {
    switch (propertyType?.toLowerCase()) {
      case 'single_family':
        return 'bg-blue-50'
      case 'condo':
        return 'bg-indigo-50'
      case 'vacant_land':
        return 'bg-emerald-50'
      case 'commercial':
        return 'bg-amber-50'
      case 'multifamily':
        return 'bg-purple-50'
      default:
        return 'bg-slate-50'
    }
  }

  // Show fallback during SSR or if no image/error
  if (!mounted || error || !imageUrl) {
    return (
      <div
        className={cn(
          sizeClasses[size],
          'rounded-lg border border-slate-200 flex flex-col items-center justify-center overflow-hidden bg-slate-50',
          className
        )}
        title={`${propertyType?.replace('_', ' ') || 'Property'} - ${parcelNumber} - No image available`}
      >
        <ImageOff className={cn('text-slate-300 mb-1', size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-5 h-5' : 'w-6 h-6')} />
        {size !== 'sm' && (
          <span className="text-[8px] text-slate-400 text-center leading-tight px-1">
            No image
          </span>
        )}
      </div>
    )
  }

  // Only render img on client side
  return (
    <div
      className={cn(
        sizeClasses[size],
        'rounded-lg bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center',
        className
      )}
    >
      <img
        src={imageUrl}
        alt={`Property ${parcelNumber}`}
        className="w-full h-full object-cover"
        onError={() => setError(true)}
        loading="lazy"
      />
    </div>
  )
}

// Utah County Parcel Map Image Component
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
