// Pure utility function - safe for client and server
export function calculateValueGap(
  countyValue: number | null | undefined,
  zestimate: number | null | undefined
): { gapPercent: number | null; label: string; color: string } {
  if (!countyValue || !zestimate || countyValue === 0) {
    return { gapPercent: null, label: 'N/A', color: 'text-slate-400' }
  }

  const gapPercent = ((zestimate - countyValue) / countyValue) * 100
  const absGap = Math.abs(gapPercent)

  let label: string
  let color: string

  if (absGap < 5) {
    label = 'In line'
    color = 'text-emerald-600'
  } else if (absGap < 20) {
    label = gapPercent > 0 ? 'Above county' : 'Below county'
    color = 'text-amber-600'
  } else {
    label = gapPercent > 0 ? 'Well above' : 'Well below'
    color = 'text-red-600'
  }

  return { gapPercent, label, color }
}
