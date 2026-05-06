import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ExternalLink } from 'lucide-react'

interface TitleSignals {
  document_count_5yr: number | null
  last_transfer_date: Date | null
  last_transfer_type: string | null
  mortgage_docs_found: number | null
  lien_docs_found: number | null
  release_docs_found: number | null
  red_flags_count: number
  yellow_flags_count: number
  scraped_at: Date
}

interface TitleSignalsPanelProps {
  titleSignals: TitleSignals | null
  parcelNumber: string
}

const DOC_TYPE_LABELS: Record<string, string> = {
  WD: 'Warranty Deed',
  DQT: 'Quit Claim Deed',
  'D TR': 'Deed of Trust',
  REC: 'Reconveyance',
}

export function TitleSignalsPanel({ titleSignals, parcelNumber }: TitleSignalsPanelProps) {
  if (!titleSignals) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recorder Signals</CardTitle>
          <CardDescription>Automated data from Utah County Recorder</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 py-4 text-center">
            No recorder data yet. Run the pipeline to fetch title signals.
          </p>
        </CardContent>
      </Card>
    )
  }

  const hasRedFlags = titleSignals.red_flags_count > 0
  const scraped = new Date(titleSignals.scraped_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  })

  let lastTransferLabel = 'Unknown'
  if (titleSignals.last_transfer_date) {
    lastTransferLabel = new Date(titleSignals.last_transfer_date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    })
  }

  const transferTypeLabel = titleSignals.last_transfer_type
    ? (DOC_TYPE_LABELS[titleSignals.last_transfer_type] ?? titleSignals.last_transfer_type)
    : null

  const recorderUrl = `https://www.utahcounty.gov/LandRecords/Property.asp?av_serial=${parcelNumber.replace(/:/g, '')}`

  return (
    <Card className={hasRedFlags ? 'border-red-200' : undefined}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">Recorder Signals</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <span>Utah County Recorder - scraped {scraped}</span>
              <a
                href={recorderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:underline"
              >
                <ExternalLink size={12} />
                View source
              </a>
            </CardDescription>
          </div>
          {hasRedFlags && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded border border-red-200 whitespace-nowrap">
              {titleSignals.red_flags_count} alert{titleSignals.red_flags_count !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div className="p-3 bg-gray-50 rounded">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Docs (last 5 yrs)</div>
            <div className="text-xl font-semibold">
              {titleSignals.document_count_5yr ?? '-'}
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded sm:col-span-2">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Last Ownership Transfer</div>
            <div className="font-semibold">{lastTransferLabel}</div>
            {transferTypeLabel && (
              <div className="text-xs text-gray-400 mt-0.5">{transferTypeLabel}</div>
            )}
          </div>

          <div className="p-3 bg-gray-50 rounded">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Trust Deeds</div>
            <div className="text-xl font-semibold">
              {titleSignals.mortgage_docs_found ?? '-'}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">financing instruments</div>
          </div>

          <div className="p-3 bg-gray-50 rounded">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Lien Notices</div>
            <div className="text-xl font-semibold">
              {titleSignals.lien_docs_found ?? '-'}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">recorded claims</div>
          </div>

          <div className="p-3 bg-gray-50 rounded">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Releases</div>
            <div className="text-xl font-semibold">
              {titleSignals.release_docs_found ?? '-'}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">reconveyances + lien releases</div>
          </div>

          <div className={`p-3 rounded sm:col-span-3 flex items-center justify-between ${
            hasRedFlags ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
          }`}>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Title Alerts</div>
              <div className={`text-base font-semibold ${hasRedFlags ? 'text-red-700' : 'text-green-700'}`}>
                {hasRedFlags
                  ? `${titleSignals.red_flags_count} unreleased lien(s) detected`
                  : 'No unreleased liens detected'}
              </div>
            </div>
            <div className={`text-2xl font-bold ${hasRedFlags ? 'text-red-600' : 'text-green-600'}`}>
              {hasRedFlags ? titleSignals.red_flags_count : 'Clear'}
            </div>
          </div>
        </div>

        {titleSignals.yellow_flags_count > 0 && (
          <div className="mt-3 p-2 bg-amber-50 rounded border border-amber-200 text-xs text-amber-700">
            {titleSignals.yellow_flags_count} preliminary lien notice{titleSignals.yellow_flags_count !== 1 ? 's' : ''} on record - verify status before bidding
          </div>
        )}
      </CardContent>
    </Card>
  )
}
