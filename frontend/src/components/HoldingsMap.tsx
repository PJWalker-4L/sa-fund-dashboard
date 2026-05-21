import * as d3 from 'd3'
import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { feature } from 'topojson-client'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import type { Topology } from 'topojson-specification'
import type { HoldingsMapPoint } from '../types'
import { countryToMapId, fmtMapValue, markerColor } from '../lib/holdings-geo'

interface CountryFeature extends Feature<Geometry> {
  id?: string
}

interface DotCoords {
  x: number
  y: number
}

interface CountryDots {
  countryId: string
  dots: DotCoords[]
}

interface Props {
  points: HoldingsMapPoint[]
  unmapped?: string[]
  loading?: boolean
  onTickerClick?: (ticker: string) => void
  embedded?: boolean
}

const WIDTH = 960
const HEIGHT = 520
const DOT_STEP = 8

function generateCountryDots(
  country: CountryFeature,
  projection: d3.GeoProjection,
  geoPath: d3.GeoPath,
): DotCoords[] {
  const bounds = geoPath.bounds(country)
  const [[x0, y0], [x1, y1]] = bounds
  if (!Number.isFinite(x0) || !Number.isFinite(y0)) return []

  const dots: DotCoords[] = []
  for (let y = y0; y <= y1; y += DOT_STEP) {
    for (let x = x0; x <= x1; x += DOT_STEP) {
      const geo = projection.invert?.([x, y])
      if (geo && d3.geoContains(country, geo)) {
        dots.push({ x, y })
      }
    }
  }
  return dots
}

function HoldingMarker({
  x,
  y,
  delay = 0,
  onClick,
  onEnter,
  onLeave,
}: {
  x: number
  y: number
  delay?: number
  onClick?: () => void
  onLeave?: () => void
  onEnter?: () => void
}) {
  return (
    <g style={{ cursor: onClick ? 'pointer' : 'default' }} onClick={onClick} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {/* Outer glow ring */}
      <motion.circle
        cx={x}
        cy={y}
        r={7}
        fill="none"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth={1}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: [0.8, 1.6, 0.8], opacity: [0.4, 0, 0.4] }}
        transition={{ duration: 2.2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut', delay }}
      />
      {/* Core dot */}
      <motion.circle
        cx={x}
        cy={y}
        r={3}
        fill="rgba(255,255,255,0.9)"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [1, 1.25, 1], opacity: [0.75, 1, 0.75] }}
        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut', delay }}
      />
    </g>
  )
}

export default function HoldingsMap({
  points,
  unmapped = [],
  loading,
  onTickerClick,
  embedded = false,
}: Props) {
  // 50m = sharp borders (rendered paths), 110m = fast geoContains (dot generation)
  const [bordersData, setBordersData] = useState<Topology | null>(null)
  const [dotsData, setDotsData] = useState<Topology | null>(null)
  const [mapLoading, setMapLoading] = useState(true)
  const [countryDots, setCountryDots] = useState<CountryDots[]>([])
  const [hovered, setHovered] = useState<HoldingsMapPoint | null>(null)
  const [hoveredCountryId, setHoveredCountryId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/countries-50m.json').then(r => r.json()),
      fetch('/countries-110m.json').then(r => r.json()),
    ]).then(([data50m, data110m]: [Topology, Topology]) => {
      setBordersData(data50m)
      setDotsData(data110m)
      setMapLoading(false)
    }).catch(() => setMapLoading(false))
  }, [])

  const projection = useMemo(
    () => d3.geoNaturalEarth1().scale(175).translate([WIDTH / 2, HEIGHT / 2]),
    [],
  )

  const geoPath = useMemo(() => d3.geoPath().projection(projection), [projection])

  // 50m features — used only for rendering the border path elements
  const countries = useMemo(() => {
    if (!bordersData) return [] as CountryFeature[]
    const collection = feature(
      bordersData,
      bordersData.objects.countries as Parameters<typeof feature>[1],
    ) as FeatureCollection
    return collection.features as CountryFeature[]
  }, [bordersData])

  // 110m features — used only for dot containment checks (10x faster geoContains)
  const dotCountries = useMemo(() => {
    if (!dotsData) return [] as CountryFeature[]
    const collection = feature(
      dotsData,
      dotsData.objects.countries as Parameters<typeof feature>[1],
    ) as FeatureCollection
    return collection.features as CountryFeature[]
  }, [dotsData])

  // Compute dots in async chunks using the fast 110m geometries
  useEffect(() => {
    if (!dotCountries.length) return
    setCountryDots([])
    const CHUNK = 10
    let i = 0
    const results: CountryDots[] = []
    function processChunk() {
      const end = Math.min(i + CHUNK, dotCountries.length)
      for (; i < end; i++) {
        const c = dotCountries[i]
        results.push({ countryId: String(c.id ?? ''), dots: generateCountryDots(c, projection, geoPath) })
      }
      setCountryDots([...results])
      if (i < dotCountries.length) setTimeout(processChunk, 0)
    }
    setTimeout(processChunk, 0)
  }, [dotCountries, projection, geoPath])

  const activeCountryIds = useMemo(() => {
    const ids = new Set<string>()
    for (const p of points) {
      const id = countryToMapId(p.country)
      if (id) ids.add(id)
    }
    return ids
  }, [points])

  const projectedPoints = useMemo(() => {
    return points
      .map(p => {
        const coords = projection([p.lng, p.lat])
        if (!coords) return null
        return { ...p, x: coords[0], y: coords[1] }
      })
      .filter(Boolean) as Array<HoldingsMapPoint & { x: number; y: number }>
  }, [points, projection])

  if (loading || mapLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: embedded ? 420 : 480,
        background: 'var(--bg)',
        border: embedded ? 'none' : '1px solid var(--border)',
      }}>
        <span className="pulse" style={{ color: 'var(--text-3)', fontSize: 12, fontFamily: 'var(--mono)' }}>
          loading map…
        </span>
      </div>
    )
  }

  return (
    <div style={{
      position: 'relative',
      background: 'var(--bg)',
      border: embedded ? 'none' : '1px solid var(--border)',
    }}>
      {!embedded && (
        <div style={{
          padding: '10px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        }}>
          <span className="section-label">Holdings Map</span>
          <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
            {projectedPoints.length} locations
            {unmapped.length > 0 ? ` · ${unmapped.length} unmapped` : ''}
          </span>
        </div>
      )}

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ width: '100%', height: 'auto', display: 'block', background: 'var(--bg)' }}
        preserveAspectRatio="xMidYMid meet"
      >
        {countryDots.map(country => {
          const id = country.countryId
          const hasHoldings = activeCountryIds.has(id)
          const isHovered = hoveredCountryId === id

          const countryFeature = countries.find(c => String(c.id ?? '') === id)
          const borderOpacity = isHovered && hasHoldings ? 1.0 : hasHoldings ? 0.85 : isHovered ? 0.5 : 0.35
          const borderStroke = isHovered && hasHoldings ? '#00c8e0' : hasHoldings ? 'rgba(0,200,224,0.6)' : '#1e3058'
          const borderWidth = isHovered && hasHoldings ? 1.2 : hasHoldings ? 0.8 : 0.5
          const dotOpacity = isHovered && hasHoldings ? 0.95 : isHovered ? 0.7 : hasHoldings ? 0.75 : 0.28
          const dotColor = hasHoldings ? '#00c8e0' : 'rgba(140,185,230,0.8)'

          return (
            <g
              key={id || 'unknown'}
              onMouseEnter={() => setHoveredCountryId(id)}
              onMouseLeave={() => setHoveredCountryId(null)}
            >
              {countryFeature && (
                <path
                  d={geoPath(countryFeature) ?? ''}
                  fill="transparent"
                  stroke={borderStroke}
                  strokeWidth={borderWidth}
                  opacity={borderOpacity}
                  style={{ transition: 'opacity 0.15s ease, stroke 0.15s ease' }}
                />
              )}

              {country.dots.map((dot, index) => {
                if (index % 5 === 0) {
                  return (
                    <motion.circle
                      key={index}
                      cx={dot.x}
                      cy={dot.y}
                      r={1.0}
                      fill={dotColor}
                      initial={{ opacity: dotOpacity }}
                      animate={{
                        opacity: [dotOpacity, Math.min(1, dotOpacity + 0.35), dotOpacity],
                        scale: [1, 1.3, 1],
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: 'easeInOut',
                        delay: (index % 20) * 0.12,
                      }}
                    />
                  )
                }
                return (
                  <circle
                    key={index}
                    cx={dot.x}
                    cy={dot.y}
                    r={1.0}
                    fill={dotColor}
                    opacity={dotOpacity}
                  />
                )
              })}
            </g>
          )
        })}

        {projectedPoints.map((p, i) => (
          <HoldingMarker
            key={`${p.ticker}_${p.putCall ?? 'SHARE'}_${i}`}
            x={p.x}
            y={p.y}
            delay={(i % 12) * 0.08}
            onClick={onTickerClick ? () => onTickerClick(p.ticker) : undefined}
            onEnter={() => setHovered(p)}
            onLeave={() => setHovered(null)}
          />
        ))}
      </svg>

      {hovered && (
        <div style={{
          position: 'absolute',
          left: 16,
          bottom: 16,
          background: 'rgba(7, 20, 40, 0.96)',
          border: '1px solid rgba(0,200,224,0.25)',
          padding: '10px 14px',
          minWidth: 180,
          pointerEvents: 'none',
        }}>
          <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 13, color: 'var(--text-1)' }}>
            {hovered.ticker}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>
            {hovered.city}, {hovered.country}
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 12, marginTop: 6 }}>
            {fmtMapValue(hovered.value)}
            {hovered.putCall ? (
              <span style={{ marginLeft: 8, color: markerColor(hovered.putCall), fontSize: 10 }}>
                {hovered.putCall.toUpperCase()}
              </span>
            ) : (
              <span style={{ marginLeft: 8, color: 'var(--text-3)', fontSize: 10 }}>SHARE</span>
            )}
          </div>
          {hovered.thesis_role && (
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4, letterSpacing: '0.05em' }}>
              {hovered.thesis_role.toUpperCase()}
            </div>
          )}
        </div>
      )}

      {embedded && (
        <div style={{
          position: 'absolute',
          top: 10,
          right: 12,
          fontSize: 10,
          color: 'var(--text-3)',
          fontFamily: 'var(--mono)',
          pointerEvents: 'none',
        }}>
          {projectedPoints.length} locations
          {unmapped.length > 0 ? ` · ${unmapped.length} unmapped` : ''}
        </div>
      )}
    </div>
  )
}
