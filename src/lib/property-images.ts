/**
 * Property Image Helpers
 * Generates high-quality static images for property visuals
 * Uses Google Street View Static API instead of embeds for better quality
 */

export interface PropertyImageUrls {
  streetViewStatic: string | null
  streetViewAvailable: boolean
  aerialStatic: string | null
  googleMapsEmbed: string | null
  googleMapsUrl: string | null
}

/**
 * Generate Street View Static image URL
 * Requires GOOGLE_MAPS_API_KEY environment variable
 * Returns null if no coordinates available
 */
export function getStreetViewStaticUrl(
  lat: number | null,
  lng: number | null,
  options: {
    width?: number
    height?: number
    fov?: number
    heading?: number
    pitch?: number
  } = {}
): string | null {
  if (!lat || !lng) return null

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    console.warn('Google Maps API key not configured')
    return null
  }

  const {
    width = 1600,
    height = 900,
    fov = 80,
    heading = 0,
    pitch = 0
  } = options

  // Use Street View Static API for high-res image
  return `https://maps.googleapis.com/maps/api/streetview?size=${width}x${height}&location=${lat},${lng}&fov=${fov}&heading=${heading}&pitch=${pitch}&key=${apiKey}`
}

/**
 * Generate Street View metadata URL to check if image exists
 * Call this to verify Street View availability before showing image
 */
export function getStreetViewMetadataUrl(
  lat: number | null,
  lng: number | null
): string | null {
  if (!lat || !lng) return null

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) return null

  return `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&key=${apiKey}`
}

/**
 * Check if Street View image exists for given coordinates
 * Returns true if status is "OK"
 */
export async function checkStreetViewAvailability(
  lat: number | null,
  lng: number | null
): Promise<boolean> {
  if (!lat || !lng) return false

  try {
    const metadataUrl = getStreetViewMetadataUrl(lat, lng)
    if (!metadataUrl) return false

    const response = await fetch(metadataUrl)
    const data = await response.json()

    return data.status === 'OK'
  } catch (error) {
    console.error('Error checking Street View availability:', error)
    return false
  }
}

/**
 * Generate all property image URLs
 * Prioritizes high-quality static images over embeds
 */
export async function generatePropertyImageUrls(
  lat: number | null,
  lng: number | null,
  address: string | null
): Promise<PropertyImageUrls> {
  // Check if Street View is available
  const streetViewAvailable = await checkStreetViewAvailability(lat, lng)

  // Generate URLs
  const streetViewStatic = streetViewAvailable
    ? getStreetViewStaticUrl(lat, lng)
    : null

  // For aerial, we'd need a different API (like Mapbox Satellite or Google Maps Static)
  // For now, we'll leave it null or use a placeholder
  const aerialStatic = null

  // Embed URL as fallback
  const googleMapsEmbed = address
    ? `https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=m&z=18&ie=UTF8&iwloc=&output=embed`
    : null

  // Direct Google Maps URL
  const googleMapsUrl = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : lat && lng
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      : null

  return {
    streetViewStatic,
    streetViewAvailable,
    aerialStatic,
    googleMapsEmbed,
    googleMapsUrl
  }
}

/**
 * Get simple image URLs without async checks
 * Use this for server-side rendering where you can't await
 */
export function getPropertyImageUrlsSync(
  lat: number | null,
  lng: number | null,
  address: string | null
): Omit<PropertyImageUrls, 'streetViewAvailable'> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  const streetViewStatic = lat && lng && apiKey
    ? `https://maps.googleapis.com/maps/api/streetview?size=1600x900&location=${lat},${lng}&fov=80&heading=0&pitch=0&key=${apiKey}`
    : null

  const googleMapsEmbed = address
    ? `https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=m&z=18&ie=UTF8&iwloc=&output=embed`
    : null

  const googleMapsUrl = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : lat && lng
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      : null

  return {
    streetViewStatic,
    aerialStatic: null,
    googleMapsEmbed,
    googleMapsUrl
  }
}
