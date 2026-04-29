'use client'

import { useState, useEffect } from 'react'

interface SafeImageProps {
  src: string
  alt: string
  className?: string
}

export function SafeImage({ src, alt, className = '' }: SafeImageProps) {
  const [hasError, setHasError] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Don't render anything during SSR or if image failed
  if (!mounted || hasError) {
    return null
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
      loading="lazy"
    />
  )
}

interface SafeImageWithLinkProps {
  src: string
  alt: string
  href: string
  className?: string
  imgClassName?: string
}

export function SafeImageWithLink({
  src,
  alt,
  href,
  className = '',
  imgClassName = '',
}: SafeImageWithLinkProps) {
  const [hasError, setHasError] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || hasError) {
    return (
      <div className={`bg-slate-100 flex items-center justify-center ${className}`}>
        <span className="text-xs text-slate-400">No image</span>
      </div>
    )
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`block rounded-lg overflow-hidden border border-slate-200 hover:opacity-90 transition-opacity ${className}`}
    >
      <img
        src={src}
        alt={alt}
        className={`w-full h-48 object-cover ${imgClassName}`}
        onError={() => setHasError(true)}
        loading="lazy"
      />
    </a>
  )
}
