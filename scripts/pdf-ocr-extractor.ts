// PDF OCR Extractor for Tax Sale Properties
// Supports: Google Vision API, AWS Textract, or Tesseract (local)
// Usage: npx ts-node scripts/pdf-ocr-extractor.ts <path-to-pdf>

import * as fs from 'fs'
import * as path from 'path'

// Interfaces
interface PropertyData {
  parcel_number?: string
  property_address?: string
  owner_name?: string
  total_amount_due?: number
  acres?: number
  city?: string
}

interface OCROptions {
  provider: 'google' | 'aws' | 'tesseract'
  apiKey?: string
  region?: string // For AWS
}

// Main extraction class
class PDFTaxExtractor {
  private options: OCROptions

  constructor(options: OCROptions) {
    this.options = options
  }

  async extractFromPDF(pdfPath: string): Promise<PropertyData[]> {
    console.log(`Extracting from: ${pdfPath}`)

    // Convert PDF to images (one per page)
    const images = await this.convertPDFToImages(pdfPath)

    // Run OCR on each image
    const results: PropertyData[] = []
    for (const image of images) {
      const text = await this.runOCR(image)
      const properties = this.parseTextToProperties(text)
      results.push(...properties)
    }

    return this.deduplicate(results)
  }

  private async convertPDFToImages(pdfPath: string): Promise<string[]> {
    // Using pdftoppm or ImageMagick
    const outputDir = path.dirname(pdfPath)
    const baseName = path.basename(pdfPath, '.pdf')

    try {
      // Convert PDF to PNG images (300 DPI for good OCR quality)
      const { execSync } = require('child_process')
      const cmd = `pdftoppm -png -r 300 "${pdfPath}" "${outputDir}/${baseName}-page"`
      execSync(cmd)

      // Get list of generated images
      const files = fs.readdirSync(outputDir)
      return files
        .filter(f => f.startsWith(`${baseName}-page`) && f.endsWith('.png'))
        .map(f => path.join(outputDir, f))
    } catch (error) {
      console.error('Error converting PDF:', error)
      throw new Error('Failed to convert PDF to images. Install pdftoppm or ImageMagick.')
    }
  }

  private async runOCR(imagePath: string): Promise<string> {
    switch (this.options.provider) {
      case 'google':
        return this.runGoogleVisionOCR(imagePath)
      case 'aws':
        return this.runAWSTextractOCR(imagePath)
      case 'tesseract':
        return this.runTesseractOCR(imagePath)
      default:
        throw new Error(`Unknown OCR provider: ${this.options.provider}`)
    }
  }

  private async runGoogleVisionOCR(imagePath: string): Promise<string> {
    // Requires GOOGLE_CLOUD_API_KEY env var
    const apiKey = this.options.apiKey || process.env.GOOGLE_CLOUD_API_KEY
    if (!apiKey) throw new Error('Google Cloud API key required')

    const imageBase64 = fs.readFileSync(imagePath).toString('base64')

    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: imageBase64 },
            features: [{ type: 'TEXT_DETECTION' }]
          }]
        })
      }
    )

    const data = await response.json()
    return data.responses[0]?.fullTextAnnotation?.text || ''
  }

  private async runAWSTextractOCR(imagePath: string): Promise<string> {
    // Requires AWS credentials
    const { TextractClient, DetectDocumentTextCommand } = require('@aws-sdk/client-textract')

    const client = new TextractClient({
      region: this.options.region || 'us-east-1'
    })

    const imageBytes = fs.readFileSync(imagePath)
    const command = new DetectDocumentTextCommand({
      Document: { Bytes: imageBytes }
    })

    const response = await client.send(command)
    return response.Blocks
      ?.filter((b: any) => b.BlockType === 'LINE')
      ?.map((b: any) => b.Text)
      ?.join('\n') || ''
  }

  private async runTesseractOCR(imagePath: string): Promise<string> {
    // Requires tesseract installed locally
    const { execSync } = require('child_process')
    const output = execSync(`tesseract "${imagePath}" stdout`, { encoding: 'utf8' })
    return output
  }

  private parseTextToProperties(text: string): PropertyData[] {
    const properties: PropertyData[] = []
    const lines = text.split('\n')

    // Patterns for different county formats
    const patterns = {
      // Davis County format: "08-001-0002 123 MAIN ST FARMINGTON JOHN DOE $1,234.56"
      davis: /(\d{2}-\d{3}-\d{4})\s+(.+?)\s+([A-Z\s]+)\s+([A-Z\s]+)\s+\$?([\d,\.]+)/i,

      // Generic parcel formats
      parcelNumber: /\b\d{2}-\d{3}-\d{4}\b|\b\d{9,14}\b/,

      // Dollar amounts
      amount: /\$?\d{1,3}(,\d{3})*\.?\d{0,2}/,

      // Acres
      acres: /(\d+\.?\d*)\s*ac/i
    }

    let currentProperty: Partial<PropertyData> = {}

    for (const line of lines) {
      const cleanLine = line.trim()
      if (!cleanLine) continue

      // Try to match Davis County format
      const davisMatch = cleanLine.match(patterns.davis)
      if (davisMatch) {
        properties.push({
          parcel_number: davisMatch[1],
          property_address: davisMatch[2].trim(),
          city: davisMatch[3].trim(),
          owner_name: davisMatch[4].trim(),
          total_amount_due: this.parseAmount(davisMatch[5])
        })
        continue
      }

      // Generic parsing for other formats
      if (patterns.parcelNumber.test(cleanLine)) {
        // Save previous property if exists
        if (currentProperty.parcel_number) {
          properties.push(currentProperty as PropertyData)
        }

        // Start new property
        const parcelMatch = cleanLine.match(patterns.parcelNumber)
        currentProperty = {
          parcel_number: parcelMatch?.[0]
        }
      }

      // Look for amounts
      const amountMatch = cleanLine.match(patterns.amount)
      if (amountMatch && currentProperty.parcel_number) {
        const amount = this.parseAmount(amountMatch[0])
        if (amount > 100) { // Filter out small numbers that aren't tax amounts
          currentProperty.total_amount_due = amount
        }
      }

      // Look for acres
      const acresMatch = cleanLine.match(patterns.acres)
      if (acresMatch && currentProperty.parcel_number) {
        currentProperty.acres = parseFloat(acresMatch[1])
      }

      // Heuristic: lines with only letters might be names or addresses
      if (cleanLine.match(/^[A-Z\s,\.]+$/) && cleanLine.length > 10) {
        if (!currentProperty.owner_name) {
          currentProperty.owner_name = cleanLine
        } else if (!currentProperty.property_address) {
          currentProperty.property_address = cleanLine
        }
      }
    }

    // Add last property
    if (currentProperty.parcel_number) {
      properties.push(currentProperty as PropertyData)
    }

    return properties
  }

  private parseAmount(amountStr: string): number {
    return parseFloat(amountStr.replace(/[$,]/g, ''))
  }

  private deduplicate(properties: PropertyData[]): PropertyData[] {
    const seen = new Set<string>()
    return properties.filter(p => {
      const key = p.parcel_number || `${p.property_address}-${p.owner_name}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  async exportToCSV(properties: PropertyData[], outputPath: string) {
    const headers = ['parcel_number', 'property_address', 'city', 'owner_name', 'total_amount_due', 'acres']

    const csv = [
      headers.join(','),
      ...properties.map(p => [
        p.parcel_number || '',
        `"${p.property_address || ''}"`,
        p.city || '',
        `"${p.owner_name || ''}"`,
        p.total_amount_due || '',
        p.acres || ''
      ].join(','))
    ].join('\n')

    fs.writeFileSync(outputPath, csv)
    console.log(`Exported ${properties.length} properties to ${outputPath}`)
  }
}

// CLI usage
async function main() {
  const pdfPath = process.argv[2]
  if (!pdfPath) {
    console.log('Usage: npx ts-node scripts/pdf-ocr-extractor.ts <path-to-pdf> [provider]')
    console.log('Providers: google (default), aws, tesseract')
    process.exit(1)
  }

  const provider = (process.argv[3] as any) || 'google'

  const extractor = new PDFTaxExtractor({
    provider,
    apiKey: process.env.GOOGLE_CLOUD_API_KEY || process.env.AWS_ACCESS_KEY_ID
  })

  try {
    const properties = await extractor.extractFromPDF(pdfPath)

    const outputPath = pdfPath.replace('.pdf', '-extracted.csv')
    await extractor.exportToCSV(properties, outputPath)

    console.log('\nExtraction complete!')
    console.log(`Total properties: ${properties.length}`)
    console.log(`Sample:`)
    console.log(properties.slice(0, 3))
  } catch (error) {
    console.error('Extraction failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

export { PDFTaxExtractor, PropertyData, OCROptions }
