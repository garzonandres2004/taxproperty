#!/usr/bin/env tsx
import { lookupAgrc } from '@/lib/pipeline/agrc-lookup'

async function main() {
  const cases = [
    { county: 'box_elder', parcel: '08-067-0051', expect: 'SERIAL_NUM hit' },
    { county: 'box_elder', parcel: '01-150-0083', expect: 'SERIAL_NUM hit' },
    { county: 'box_elder', parcel: '01-150-0012', expect: 'likely miss (lot doesnt exist)' },
    { county: 'salt_lake', parcel: '22-05-333-013-0000', expect: 'hit or miss' },
  ]

  for (const c of cases) {
    const result = await lookupAgrc(c.county, c.parcel)
    console.log(`${c.county} ${c.parcel}: ${result ? `HIT — MV:${result.market_value} owner:${result.owner_name}` : 'MISS'} (${c.expect})`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
