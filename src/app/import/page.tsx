'use client'

import { useState, useCallback } from 'react'
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
import { getAllPresets, getPreset, ImportPreset, getConfidenceColor, getConfidenceLabel } from '@/lib/import/presets'
import { parseCSV, normalizeRows, autoMapHeaders, ImportRow, ImportError } from '@/lib/import/parser'

type ImportStep = 'upload' | 'preview' | 'mapping' | 'results'

export default function ImportPage() {
  const [step, setStep] = useState<ImportStep>('upload')
  const [selectedPreset, setSelectedPreset] = useState<string>('')
  const [csvText, setCsvText] = useState<string>('')
  const [parseResult, setParseResult] = useState<{
    headers: string[]
    rows: Record<string, string>[]
  } | null>(null)
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({})
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    imported: number
    skipped: number
    errors: ImportError[]
  } | null>(null)

  const presets = getAllPresets()
  const currentPreset = selectedPreset ? getPreset(selectedPreset) : null

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setCsvText(text)

      // Parse CSV
      const result = parseCSV(text)
      setParseResult({
        headers: result.headers,
        rows: result.rows
      })

      // Auto-detect preset
      const headersLower = result.headers.map(h => h.toLowerCase())
      let detectedPreset = ''

      if (headersLower.some(h => h.includes('salt') || h.includes('slc'))) {
        detectedPreset = 'salt_lake'
      } else if (headersLower.some(h => h.includes('utah') || h.includes('provo'))) {
        detectedPreset = 'utah'
      } else {
        // Default based on column names
        detectedPreset = 'utah'
      }

      setSelectedPreset(detectedPreset)

      // Auto-generate field mappings
      if (detectedPreset) {
        const preset = getPreset(detectedPreset)
        if (preset) {
          const autoMappings = autoMapHeaders(result.headers, preset)
          setFieldMappings(autoMappings)
        }
      }

      setStep('preview')
    }
    reader.readAsText(file)
  }, [])

  const handleManualPaste = useCallback(() => {
    if (!csvText.trim()) return

    const result = parseCSV(csvText)
    setParseResult({
      headers: result.headers,
      rows: result.rows
    })

    if (selectedPreset) {
      const preset = getPreset(selectedPreset)
      if (preset) {
        const autoMappings = autoMapHeaders(result.headers, preset)
        setFieldMappings(autoMappings)
      }
    }

    setStep('preview')
  }, [csvText, selectedPreset])

  const handleImport = async () => {
    if (!currentPreset || !parseResult) return

    setIsImporting(true)

    // Apply custom field mappings
    const remappedRows = parseResult.rows.map(row => {
      const newRow: Record<string, string> = {}
      for (const [csvHeader, appField] of Object.entries(fieldMappings)) {
        if (appField && row[csvHeader]) {
          newRow[appField] = row[csvHeader]
        }
      }
      return newRow
    })

    // Normalize rows
    const { valid, errors } = normalizeRows(remappedRows, currentPreset)

    // Import valid rows with source tracking
    let imported = 0
    let skipped = 0

    const now = new Date().toISOString()

    for (const row of valid) {
      try {
        // Add source tracking data
        const rowWithSource = {
          ...row,
          county_source_url: currentPreset.countyUrls.currentList || currentPreset.countyUrls.main,
          source_last_checked_at: now,
          status_last_verified_at: now
        }

        const response = await fetch('/api/properties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rowWithSource)
        })

        if (response.ok) {
          imported++
        } else {
          skipped++
        }
      } catch {
        skipped++
      }
    }

    setImportResult({ imported, skipped, errors })
    setIsImporting(false)
    setStep('results')
  }

  const renderUploadStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload CSV File</CardTitle>
          <CardDescription>
            Import properties from Utah County or Salt Lake County tax sale lists
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Select County Preset</Label>
            <Select value={selectedPreset} onValueChange={setSelectedPreset}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a county preset..." />
              </SelectTrigger>
              <SelectContent>
                {presets.map(preset => (
                  <SelectItem key={preset.county} value={preset.county}>
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">
              {currentPreset?.description}
            </p>
          </div>

          {/* Preset Confidence Warning */}
          {currentPreset && (
            <Alert className={getConfidenceColor(currentPreset.confidence)}>
              <AlertTitle className="flex items-center gap-2">
                <Badge variant="outline">{getConfidenceLabel(currentPreset.confidence)}</Badge>
                Preset Confidence
              </AlertTitle>
              <AlertDescription className="mt-2">
                {currentPreset.confidenceNote}
                <div className="mt-2">
                  <a
                    href={currentPreset.countyUrls.main}
                    target="_blank"
                    rel="noopener"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Verify current info on county website →
                  </a>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>CSV File</Label>
            <Input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Or paste CSV data</Label>
            <Textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={`Parcel Number,Owner,Amount Due,...
55-123-4567,John Smith,8500.00,...`}
              className="min-h-[150px] font-mono text-sm"
            />
            <Button
              variant="outline"
              onClick={handleManualPaste}
              disabled={!csvText.trim() || !selectedPreset}
            >
              Preview Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderPreviewStep = () => {
    if (!parseResult) return null

    const previewRows = parseResult.rows.slice(0, 5)

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Preview Data</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep('upload')}>
              ← Back
            </Button>
            <Button onClick={() => setStep('mapping')}>
              Map Fields →
            </Button>
          </div>
        </div>

        <Alert>
          <AlertTitle>Found {parseResult.rows.length} rows</AlertTitle>
          <AlertDescription>
            Showing first {previewRows.length} rows. County preset: {currentPreset?.name}
          </AlertDescription>
        </Alert>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    {parseResult.headers.map(header => (
                      <th key={header} className="px-4 py-3 text-left font-medium">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {previewRows.map((row, i) => (
                    <tr key={i}>
                      {parseResult.headers.map(header => (
                        <td key={header} className="px-4 py-2 text-gray-600">
                          {row[header]?.substring(0, 50)}
                          {row[header]?.length > 50 ? '...' : ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderMappingStep = () => {
    if (!parseResult || !currentPreset) return null

    const appFields = [
      { value: '', label: '-- Ignore --' },
      { value: 'parcel_number', label: 'Parcel Number *' },
      { value: 'owner_name', label: 'Owner Name' },
      { value: 'owner_mailing_address', label: 'Mailing Address' },
      { value: 'property_address', label: 'Property Address' },
      { value: 'legal_description', label: 'Legal Description' },
      { value: 'total_amount_due', label: 'Amount Due' },
      { value: 'assessed_value', label: 'Assessed Value' },
      { value: 'estimated_market_value', label: 'Market Value' },
      { value: 'property_type', label: 'Property Type' },
      { value: 'status', label: 'Status' },
      { value: 'sale_date', label: 'Sale Date' },
      { value: 'sale_year', label: 'Sale Year' },
      { value: 'notes', label: 'Notes' },
      { value: 'zoning', label: 'Zoning' },
      { value: 'lot_size_sqft', label: 'Lot Size' },
      { value: 'building_sqft', label: 'Building SqFt' },
      { value: 'year_built', label: 'Year Built' },
    ]

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Map Fields</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep('preview')}>
              ← Back
            </Button>
            <Button onClick={handleImport} disabled={isImporting}>
              {isImporting ? 'Importing...' : 'Import Properties'}
            </Button>
          </div>
        </div>

        <Alert>
          <AlertTitle>Auto-mapped fields</AlertTitle>
          <AlertDescription>
            Review and adjust field mappings before importing. Required fields: county, parcel_number.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Field Mappings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {parseResult.headers.map(header => (
                <div key={header} className="grid grid-cols-2 gap-4 items-center">
                  <div className="font-medium text-sm">{header}</div>
                  <Select
                    value={fieldMappings[header] || ''}
                    onValueChange={(value) =>
                      setFieldMappings(prev => ({ ...prev, [header]: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select field..." />
                    </SelectTrigger>
                    <SelectContent>
                      {appFields.map(field => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Default County</Label>
                <div className="text-sm font-medium capitalize mt-1">
                  {currentPreset.county.replace('_', ' ')}
                </div>
              </div>
              <div>
                <Label>Default Sale Year</Label>
                <div className="text-sm font-medium mt-1">
                  {currentPreset.defaults.sale_year}
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              Default Property Type: {currentPreset.defaults.property_type} | Sale Year: {currentPreset.defaults.sale_year}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderResultsStep = () => {
    if (!importResult) return null

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Import Results</h2>
          <div className="flex gap-2">
            <Link href="/properties">
              <Button>View Properties →</Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-green-50 border-green-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-green-800">Imported</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {importResult.imported}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-yellow-50 border-yellow-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-yellow-800">Skipped</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">
                {importResult.skipped}
              </div>
            </CardContent>
          </Card>

          <Card className={importResult.errors.length > 0 ? 'bg-red-50 border-red-200' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className={`text-sm ${importResult.errors.length > 0 ? 'text-red-800' : ''}`}>
                Errors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${importResult.errors.length > 0 ? 'text-red-600' : ''}`}>
                {importResult.errors.length}
              </div>
            </CardContent>
          </Card>
        </div>

        {importResult.errors.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Error Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr className="text-left">
                      <th className="pb-2 font-medium">Row</th>
                      <th className="pb-2 font-medium">Reason</th>
                      <th className="pb-2 font-medium">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {importResult.errors.map((error, i) => (
                      <tr key={i}>
                        <td className="py-2">{error.rowIndex}</td>
                        <td className="py-2 text-red-600">{error.reason}</td>
                        <td className="py-2 text-gray-500">
                          {JSON.stringify(error.row).substring(0, 100)}...
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-4">
          <Button variant="outline" onClick={() => {
            setStep('upload')
            setImportResult(null)
            setCsvText('')
            setParseResult(null)
          }}>
            Import Another File
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Import Properties</h1>
        <Link href="/properties">
          <Button variant="outline">← Cancel</Button>
        </Link>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 mb-8">
        {(['upload', 'preview', 'mapping', 'results'] as ImportStep[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <Badge
              variant={step === s ? 'default' : 'outline'}
              className={step === s ? 'bg-blue-600' : ''}
            >
              {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
            </Badge>
            {i < 3 && <span className="text-gray-300">→</span>}
          </div>
        ))}
      </div>

      {step === 'upload' && renderUploadStep()}
      {step === 'preview' && renderPreviewStep()}
      {step === 'mapping' && renderMappingStep()}
      {step === 'results' && renderResultsStep()}
    </div>
  )
}
