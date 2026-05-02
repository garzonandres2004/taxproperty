// Geocoding utility for addresses
// Used by counties without native coordinate APIs (like Tooele)

export interface GeocodingResult {
  latitude: number
  longitude: number
  formattedAddress?: string
  confidence: 'high' | 'medium' | 'low'
  source: 'google' | 'arcgis' | 'manual'
}

// Geocode an address using Google Geocoding API
export async function geocodeAddress(
  address: string,
  city?: string,
  state: string = 'Utah'
): Promise<GeocodingResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    console.warn('GOOGLE_MAPS_API_KEY not set - cannot geocode')
    return null
  }

  const fullAddress = `${address}, ${city || ''}, ${state}`.replace(/,\s*,/g, ',').trim()

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}&region=us`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Geocoding API returned ${response.status}`)
    }

    const data = await response.json()

    if (data.status !== 'OK' || !data.results?.length) {
      console.warn(`Geocoding failed: ${data.status}`)
      return null
    }

    const result = data.results[0]
    const location = result.geometry.location

    // Determine confidence from location type
    let confidence: 'high' | 'medium' | 'low' = 'medium'
    const locationType = result.geometry.location_type
    if (locationType === 'ROOFTOP') {
      confidence = 'high'
    } else if (locationType === 'RANGE_INTERPOLATED') {
      confidence = 'medium'
    } else {
      confidence = 'low'
    }

    return {
      latitude: location.lat,
      longitude: location.lng,
      formattedAddress: result.formatted_address,
      confidence,
      source: 'google'
    }
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

// Batch geocode multiple addresses
export async function batchGeocode(
  addresses: { id: string; address: string; city?: string }[]
): Promise<Map<string, GeocodingResult>> {
  const results = new Map<string, GeocodingResult>()

  // Process sequentially to avoid rate limits
  for (const item of addresses) {
    const result = await geocodeAddress(item.address, item.city)
    if (result) {
      results.set(item.id, result)
    }
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  return results
}

// Generate Street View URL from coordinates
export function generateStreetViewUrl(
  latitude: number,
  longitude: number,
  apiKey: string,
  options: { size?: string; fov?: number; pitch?: number } = {}
): string {
  const { size = '400x300', fov = 80, pitch = 0 } = options
  return `https://maps.googleapis.com/maps/api/streetview?size=${size}&location=${latitude},${longitude}&fov=${fov}&pitch=${pitch}&key=${apiKey}`
}

// Generate Aerial/Satellite URL from coordinates
export function generateAerialUrl(
  latitude: number,
  longitude: number,
  apiKey: string,
  options: { size?: string; zoom?: number } = {}
): string {
  const { size = '400x300', zoom = 18 } = options
  return `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=${zoom}&size=${size}&maptype=satellite&key=${apiKey}`
}

// Generate Street View metadata URL (to check if Street View exists)
export async function checkStreetViewExists(
  latitude: number,
  longitude: number,
  apiKey: string
): Promise<boolean> {
  try {
    const url = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${latitude},${longitude}&key=${apiKey}`
    const response = await fetch(url)
    const data = await response.json()
    return data.status === 'OK'
  } catch (error) {
    console.error('Street View metadata error:', error)
    return false
  }
}
