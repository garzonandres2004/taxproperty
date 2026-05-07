#!/usr/bin/env tsx
import { lookupAgrc } from '@/lib/pipeline/agrc-lookup'

async function main() {
  const cases = [
    { county: 'box_elder', parcel: '08-067-0051', expect: 'SERIAL_NUM hit' },
    { county: 'box_elder', parcel: '01-150-0083', expect: 'SERIAL_NUM hit' },
    { county: 'box_elder', parcel: '01-150-0012', expect: 'hit (low value lot)' },
    { county: 'salt_lake', parcel: '22-05-333-013-0000', expect: 'hit' },
    { county: 'juab', parcel: 'XE00-5298', expect: 'LIKE raw% hit' },
    { county: 'juab', parcel: 'XD00-4481-48', expect: 'hit' },
  ]

  for (const c of cases) {
    const result = await lookupAgrc(c.county, c.parcel)
    console.log(`${c.county} ${c.parcel}: ${result ? `HIT — MV:${result.market_value} owner:${result.owner_name}` : 'MISS'} (${c.expect})`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
