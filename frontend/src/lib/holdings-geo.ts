/** Country name (yfinance / geo lookup) → TopoJSON numeric country id (countries-110m). */
export const COUNTRY_NAME_TO_MAP_ID: Record<string, string> = {
  'United States': '840',
  'USA': '840',
  'Canada': '124',
  'Australia': '036',
  'Singapore': '702',
  'Taiwan': '158',
  'Israel': '376',
  'Japan': '392',
  'Netherlands': '528',
  'Ireland': '372',
  'United Kingdom': '826',
  'Germany': '276',
  'China': '156',
  'South Korea': '410',
  'Korea': '410',
  'India': '356',
  'France': '250',
  'Switzerland': '756',
  'Hong Kong': '344',
}

export function countryToMapId(country: string): string | null {
  if (!country) return null
  const direct = COUNTRY_NAME_TO_MAP_ID[country]
  if (direct) return direct
  const lower = country.toLowerCase()
  for (const [name, id] of Object.entries(COUNTRY_NAME_TO_MAP_ID)) {
    if (name.toLowerCase() === lower || lower.includes(name.toLowerCase())) {
      return id
    }
  }
  return null
}

export function markerColor(putCall: string | null): string {
  if (putCall === 'Put') return 'var(--orange)'
  if (putCall === 'Call') return 'var(--blue)'
  return 'var(--teal)'
}

export function fmtMapValue(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}B`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}M`
  return `$${v.toFixed(0)}K`
}
