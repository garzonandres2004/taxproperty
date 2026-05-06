#!/usr/bin/env tsx
// One-off patch: re-extracts parcel_number from the title column in utah_auctions.csv.
// Use this instead of a full re-scrape when only parcel extraction logic changed.
// The title column is written directly from the page headerText, so extraction from
// title == extraction from headerText.

import * as fs from 'fs'
import * as path from 'path'

const CSV_PATH = path.join(process.cwd(), 'output', 'utah_auctions.csv')

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

function extractParcelFromTitle(title: string): string {
  // Washington-style: entire title IS the parcel ID (no spaces, has hyphen and digit)
  // e.g. "H-3-1-33-142", "ZP-2-7-HV", "LV-114-A-7"
  if (!title.includes(' ') && title.includes('-') && /\d/.test(title)) return title
  // "County Parcel 3540X"
  const m1 = title.match(/County\s+Parcel\s+([A-Za-z0-9\-:]+)/i)?.[1]
  if (m1) return m1
  // "Real Property in Juab; Parcel XE00-5298"
  const m2 = title.match(/;\s*Parcel\s+([A-Za-z0-9\-:]+)/i)?.[1]
  if (m2) return m2
  // "Real Property Sevier County Utah: 3-192A-51" — colon-delimited value
  const m3 = title.match(/:\s*([A-Za-z0-9][A-Za-z0-9\-:]*\d[A-Za-z0-9\-:]*)\s*(?:and\b|$)/i)?.[1]
  if (m3) return m3
  // Dashed all-numeric: Box Elder, Duchesne, Salt Lake
  // Negative lookbehind: don't match inside H-3-1-33-142 or similar alpha-prefixed IDs
  const m4 = title.match(/(?<![A-Za-z\-])(\d{1,5}(?:-\d{1,5}){2,})\b/)?.[1]
  if (m4) return m4
  return ''
}

function csvField(v: string): string {
  return `"${v.replace(/"/g, '""')}"`
}

const raw = fs.readFileSync(CSV_PATH, 'utf8')
const lines = raw.split('\n').filter(l => l.trim())
const headers = parseCsvLine(lines[0])

const parcelIdx = headers.indexOf('parcel_number')
const titleIdx = headers.indexOf('title')

if (parcelIdx === -1 || titleIdx === -1) {
  console.error('Could not find parcel_number or title column')
  process.exit(1)
}

let fixed = 0
let unchanged = 0
let empty = 0

const outLines = [lines[0]]

for (const line of lines.slice(1)) {
  const cols = parseCsvLine(line)
  const title = cols[titleIdx] ?? ''
  const oldParcel = cols[parcelIdx] ?? ''
  const newParcel = extractParcelFromTitle(title)

  if (newParcel && newParcel !== oldParcel) {
    cols[parcelIdx] = newParcel
    fixed++
  } else if (!newParcel) {
    empty++
  } else {
    unchanged++
  }

  outLines.push(cols.map(csvField).join(','))
}

fs.writeFileSync(CSV_PATH, outLines.join('\n'))
console.log(`Patched ${CSV_PATH}`)
console.log(`  Fixed:     ${fixed}`)
console.log(`  Unchanged: ${unchanged}`)
console.log(`  No match:  ${empty} (parcel left as-is)`)
