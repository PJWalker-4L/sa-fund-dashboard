/** Convert period_of_report (YYYY-MM-DD) to e.g. "Q1 2026" — mirrors backend sec_client.format_filing_quarter. */
export function formatFilingQuarter(period: string): string {
  const parts = period.trim().slice(0, 10).split('-')
  if (parts.length !== 3) return period || '—'
  const year = Number(parts[0])
  const month = Number(parts[1])
  if (!Number.isFinite(year) || !Number.isFinite(month)) return period
  const quarter = Math.floor((month - 1) / 3) + 1
  return `Q${quarter} ${year}`
}

export function formatPeriodWithQuarter(period: string): string {
  return `${period} (${formatFilingQuarter(period)})`
}

export function formatPeriodRange(prevPeriod: string, currPeriod: string): string {
  return `${formatPeriodWithQuarter(prevPeriod)} → ${formatPeriodWithQuarter(currPeriod)}`
}
