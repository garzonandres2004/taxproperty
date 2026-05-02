'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
// Checkbox import removed - not used
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { detectColumns, getMissingRequiredFields, getMissingImportantFields, calculateMappingConfidence, applyMapping, generateImportPreview } from '@/lib/import/column-detector'
import { parseCSV } from '@/lib/import/parser'
import { ArrowRight, Upload, FileSpreadsheet, MapPin, CheckCircle, AlertTriangle } from 'lucide-react'

// Type definitions
type ImportStep = 'county' | 'upload' | 'mapping' | 'preview' | 'results'
type CountyConfig = {
  county_name: string
  display_name: string
  state: string
  is_active: boolean
}

export default function ImportPage() {
  // Step 1: County selection
  const [step, setStep] = useState<ImportStep>('county')
  const [counties, setCounties] = useState<CountyConfig[]>([])
  const [selectedCounty, setSelectedCounty] = useState<string>('')
  const [loadingCounties, setLoadingCounties] = useState(true)

  // Step 2: Upload
  const [csvText, setCsvText] = useState<string>('')
  const [fileName, setFileName] = useState<string>('')
  const [parseResult, setParseResult] = useState<{
    headers: string[]
    rows: Record<string, string>[]
  } | null>(null)

  // Step 3: Column mapping
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({})
  const [manualMappings, setManualMappings] = useState<Record<string, string>>({})
  const [mappingConfidence, setMappingConfidence] = useState(0)

  // Step 4: Import
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    imported: number
    skipped: number
    enriched: number
    errors: Array<{ row: number; reason: string }>
  } | null>(null)

  // Load counties on mount
  useEffect(() => {
    fetchCounties()
  }, [])

  const fetchCounties = async () => {
    try {
      const response = await fetch('/api/counties')
      if (response.ok) {
        const data = await response.json()
        setCounties(data.counties || [])
      }
    } catch (error) {
      console.error('Failed to fetch counties:', error)
    } finally {
      setLoadingCounties(false)
    }
  }

  // Step 1: Handle county selection
  const handleCountySelect = (countyName: string) => {
    setSelectedCounty(countyName)
    setStep('upload')
  }

  // Step 2: Handle file upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setCsvText(text)
      processCSV(text, file.name)
    }
    reader.readAsText(file)
  }, [])

  // Handle Google Sheets URL paste
  const handleSheetsUrl = useCallback(async () => {
    if (!csvText.includes('docs.google.com/spreadsheets')) {
      alert('Please paste a Google Sheets URL')
      return
    }

    // Extract spreadsheet ID and convert to CSV export URL
    const match = csvText.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
    if (match) {
      const sheetId = match[1]
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`

      try {
        const response = await fetch(csvUrl)
        if (response.ok) {
          const text = await response.text()
          setCsvText(text)
          setFileName('google-sheets-import.csv')
          processCSV(text, 'google-sheets-import.csv')
        } else {
          alert('Could not fetch from Google Sheets. Make sure the sheet is public or download as CSV manually.')
        }
      } catch (error) {
        alert('Error fetching from Google Sheets. Download as CSV and upload manually.')
      }
    }
  }, [csvText])

  // Process CSV and auto-detect columns
  const processCSV = (text: string, filename: string) => {
    const result = parseCSV(text)
    setParseResult({
      headers: result.headers,
      rows: result.rows
    })

    // Auto-detect column mappings
    const detectedMappings = detectColumns(result.headers)
    setFieldMappings(detectedMappings)
    setManualMappings(detectedMappings)
    setMappingConfidence(calculateMappingConfidence(detectedMappings))

    setStep('mapping')
  }

  // Handle manual column mapping change
  const handleMappingChange = (field: string, csvHeader: string) => {
    const updated = { ...manualMappings, [field]: csvHeader }
    if (!csvHeader || csvHeader === '_ignore') {
      delete updated[field]
    }
    setManualMappings(updated)
    setMappingConfidence(calculateMappingConfidence(updated))
  }

  // Step 4: Proceed to preview
  const proceedToPreview = () => {
    setFieldMappings(manualMappings)
    setStep('preview')
  }

  // Step 5: Run import
  const handleImport = async () => {
    if (!parseResult || !selectedCounty) return

    setIsImporting(true)
    const errors: Array<{ row: number; reason: string }> = []
    let imported = 0
    let skipped = 0

    // Get county config for URL
    const countyConfig = counties.find(c => c.county_name === selectedCounty)
    const countyUrl = countyConfig ? `/api/counties/${selectedCounty}/url` : null

    for (let i = 0; i < parseResult.rows.length; i++) {
      const row = parseResult.rows[i]

      try {
        // Apply column mapping
        const mappedData = applyMapping(row, fieldMappings, selectedCounty)

        if (!mappedData.parcel_number) {
          errors.push({ row: i + 1, reason: 'Missing parcel number' })
          skipped++
          continue
        }

        // Import via API
        const response = await fetch('/api/properties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mappedData)
        })

        if (response.ok) {
          imported++
        } else {
          skipped++
        }
      } catch (error) {
        errors.push({ row: i + 1, reason: String(error) })
        skipped++
      }
    }

    setImportResult({ imported, skipped, enriched: 0, errors })
    setIsImporting(false)
    setStep('results')
  }

  // Step 6: Auto-enrich all imported properties
  const handleAutoEnrich = async () => {
    if (!selectedCounty) return

    try {
      const response = await fetch(`/api/counties/${selectedCounty}/enrich-all`, {
        method: 'POST'
      })

      if (response.ok) {
        const result = await response.json()
        setImportResult(prev => prev ? {
          ...prev,
          enriched: result.enriched || 0
        } : null)
      }
    } catch (error) {
      console.error('Auto-enrich failed:', error)
    }
  }

  // Get missing fields
  const missingRequired = getMissingRequiredFields(fieldMappings)
  const missingImportant = getMissingImportantFields(fieldMappings)

  // Generate preview data
  const previewData = parseResult && generateImportPreview(parseResult.rows, fieldMappings, selectedCounty, 3)

  // Render step 1: County selection
  const renderCountyStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Step 1: Select County
          </CardTitle>
          <CardDescription>
            Choose which Utah county's tax sale properties you want to import
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingCounties ? (
            <div className="text-center py-8 text-gray-500">Loading counties...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {counties.map((county) => (
                <button
                  key={county.county_name}
                  onClick={() => handleCountySelect(county.county_name)}
                  className={`p-4 border-2 rounded-lg text-left transition-all hover:shadow-md ${
                    county.is_active
                      ? 'border-green-500 bg-green-50 hover:bg-green-100'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="font-medium">{county.display_name}</div>
                  <div className="text-sm text-gray-500">
                    {county.is_active ? (
                      <span className="text-green-600">✓ Active</span>
                    ) : (
                      <span>Click to activate</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  // Render step 2: Upload
  const renderUploadStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Step 2: Upload Tax Sale List
          </CardTitle>
          <CardDescription>
            Upload a CSV file or paste a Google Sheets URL for {counties.find(c => c.county_name === selectedCounty)?.display_name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
            <FileSpreadsheet className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <Label htmlFor="csv-upload" className="cursor-pointer">
              <span className="text-blue-600 hover:text-blue-700 font-medium">Click to upload CSV</span>
              {' '}or drag and drop
            </Label>
            <Input
              id="csv-upload"
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <p className="text-sm text-gray-500 mt-2">
              Supports: .csv files from any Utah county
            </p>
          </div>

          <Separator>OR</Separator>

          {/* Google Sheets URL */}
          <div className="space-y-2">
            <Label>Paste Google Sheets URL</Label>
            <div className="flex gap-2">
              <Textarea
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="flex-1"
                rows={2}
              />
              <Button onClick={handleSheetsUrl} variant="outline">
                Fetch
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              Sheet must be publicly viewable
            </p>
          </div>

          <Button variant="outline" onClick={() => setStep('county')}>
            ← Back to County Selection
          </Button>
        </CardContent>
      </Card>
    </div>
  )

  // Render step 3: Column mapping
  const renderMappingStep = () => {
    if (!parseResult) return null

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                Step 3: Confirm Column Mapping
                {mappingConfidence >= 80 ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {mappingConfidence}% Match
                  </Badge>
                ) : mappingConfidence >= 50 ? (
                  <Badge className="bg-yellow-100 text-yellow-800">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {mappingConfidence}% Match
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {mappingConfidence}% Match
                  </Badge>
                )}
              </span>
            </CardTitle>
            <CardDescription>
              Review and correct how CSV columns map to property fields
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Required fields alert */}
            {missingRequired.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Required fields missing</AlertTitle>
                <AlertDescription>
                  {missingRequired.join(', ')} must be mapped to import
                </AlertDescription>
              </Alert>
            )}

            {/* Important fields warning */}
            {missingImportant.length > 0 && missingRequired.length === 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Important fields not detected</AlertTitle>
                <AlertDescription>
                  {missingImportant.join(', ')} - Will be filled by AGRC if possible
                </AlertDescription>
              </Alert>
            )}

            {/* Mapping table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property Field</TableHead>
                  <TableHead>CSV Column</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {['parcel_number', 'owner_name', 'total_amount_due', 'property_address', 'property_type', 'legal_description'].map((field) => {
                  const mappedHeader = manualMappings[field]
                  const isRequired = ['parcel_number'].includes(field)
                  const isMapped = !!mappedHeader

                  return (
                    <TableRow key={field}>
                      <TableCell>
                        <span className={isRequired ? 'font-semibold' : ''}>
                          {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                        {isRequired && <span className="text-red-500 ml-1">*</span>}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={mappedHeader || '_ignore'}
                          onValueChange={(val) => handleMappingChange(field, val === '_ignore' ? '' : val)}
                        >
                          <SelectTrigger className="w-[280px]">
                            <SelectValue placeholder="-- Not mapped --" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_ignore">-- Not mapped --</SelectItem>
                            {parseResult.headers.map((header) => (
                              <SelectItem key={header} value={header}>
                                {header.length > 40 ? header.substring(0, 40) + '...' : header}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {isMapped ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700">Mapped</Badge>
                        ) : isRequired ? (
                          <Badge variant="destructive">Required</Badge>
                        ) : (
                          <Badge variant="secondary">Optional</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('upload')}>
                ← Back
              </Button>
              <Button
                onClick={proceedToPreview}
                disabled={missingRequired.length > 0}
              >
                Preview Import →
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render step 4: Preview
  const renderPreviewStep = () => {
    if (!previewData || !parseResult) return null

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Step 4: Preview Import</CardTitle>
            <CardDescription>
              Showing first 3 rows of {parseResult.rows.length} total properties
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Sample data table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parcel Number</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Amount Due</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-sm">{row.parcel_number || '-'}</TableCell>
                      <TableCell>{row.owner_name || '-'}</TableCell>
                      <TableCell>
                        {row.total_amount_due ? `$${row.total_amount_due.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell>{row.property_address || '-'}</TableCell>
                      <TableCell className="capitalize">{row.property_type || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-4 text-center py-4 bg-gray-50 rounded-lg">
              <div>
                <div className="text-2xl font-bold">{parseResult.rows.length}</div>
                <div className="text-sm text-gray-600">Properties to import</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{Object.keys(fieldMappings).length}</div>
                <div className="text-sm text-gray-600">Fields mapped</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{counties.find(c => c.county_name === selectedCounty)?.display_name}</div>
                <div className="text-sm text-gray-600">Target county</div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                ← Back to Mapping
              </Button>
              <Button
                onClick={handleImport}
                disabled={isImporting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isImporting ? 'Importing...' : `Import ${parseResult.rows.length} Properties`}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render step 5: Results
  const renderResultsStep = () => {
    if (!importResult) return null

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Import Complete!</CardTitle>
            <CardDescription>
              Properties imported to {counties.find(c => c.county_name === selectedCounty)?.display_name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Results summary */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-green-600">{importResult.imported}</div>
                <div className="text-sm text-green-700">Imported</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-yellow-600">{importResult.skipped}</div>
                <div className="text-sm text-yellow-700">Skipped</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-blue-600">{importResult.enriched}</div>
                <div className="text-sm text-blue-700">Auto-Enriched</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-gray-600">
                  {importResult.errors.length}
                </div>
                <div className="text-sm text-gray-700">Errors</div>
              </div>
            </div>

            {/* Next steps */}
            <div className="space-y-3">
              <h3 className="font-medium">Next Steps:</h3>

              {importResult.imported > 0 && importResult.enriched === 0 && (
                <Button onClick={handleAutoEnrich} className="w-full">
                  Auto-Enrich All {importResult.imported} Properties from AGRC
                </Button>
              )}

              <Button variant="outline" asChild className="w-full">
                <Link href={`/properties?county=${selectedCounty}`}>
                  View Imported Properties →
                </Link>
              </Button>

              <Button variant="outline" onClick={() => {
                setStep('county')
                setSelectedCounty('')
                setCsvText('')
                setFileName('')
                setParseResult(null)
                setImportResult(null)
              }} className="w-full">
                Import Another County
              </Button>
            </div>

            {/* Errors */}
            {importResult.errors.length > 0 && (
              <div className="mt-4">
                <h3 className="font-medium text-red-600 mb-2">Import Errors:</h3>
                <div className="bg-red-50 p-3 rounded text-sm max-h-40 overflow-y-auto">
                  {importResult.errors.slice(0, 10).map((err, i) => (
                    <div key={i}>Row {err.row}: {err.reason}</div>
                  ))}
                  {importResult.errors.length > 10 && (
                    <div className="text-gray-500">
                      ...and {importResult.errors.length - 10} more errors
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main render
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Import Tax Sale Properties</h1>
        <p className="text-gray-600 mt-2">
          Universal importer for all 29 Utah counties. Works with any CSV format.
        </p>
      </div>

      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-sm">
          {['County', 'Upload', 'Mapping', 'Preview', 'Results'].map((s, i) => {
            const stepNames: ImportStep[] = ['county', 'upload', 'mapping', 'preview', 'results']
            const currentStepIndex = stepNames.indexOf(step)
            const isActive = i <= currentStepIndex
            const isCurrent = i === currentStepIndex

            return (
              <div key={s} className={`flex items-center ${i > 0 ? 'flex-1' : ''}`}>
                {i > 0 && (
                  <div className={`flex-1 h-1 mx-2 ${isActive ? 'bg-blue-500' : 'bg-gray-200'}`} />
                )}
                <div className={`px-3 py-1 rounded-full ${
                  isCurrent ? 'bg-blue-600 text-white' :
                  isActive ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {s}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Step content */}
      {step === 'county' && renderCountyStep()}
      {step === 'upload' && renderUploadStep()}
      {step === 'mapping' && renderMappingStep()}
      {step === 'preview' && renderPreviewStep()}
      {step === 'results' && renderResultsStep()}
    </div>
  )
}
