import { useRef, useState } from 'react'
import { useChartTheme, fmtNum, fmtMoney, fmtCompact, niceTicks } from './chartkit'

// Signed % change vs the previous period. `invert` = an increase is bad
// (expenses). Neutral gray when there is no baseline.
export function DeltaBadge({ current, prev, invert = false, suffix = 'vs prev' }) {
  const t = useChartTheme()
  if (!prev && !current) return null
  if (!prev) {
    return <span className="text-[10px] font-semibold" style={{ color: t.muted }}>new · {suffix}</span>
  }
  const pct = Math.round(((current - prev) / Math.abs(prev)) * 100)
  const up = pct >= 0
  const good = invert ? !up : up
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[10px] font-bold tabular-nums"
      style={{ color: pct === 0 ? t.muted : good ? t.good : t.bad }}
    >
      {up ? '▲' : '▼'} {Math.abs(pct)}% <span className="font-medium opacity-80">{suffix}</span>
    </span>
  )
}

export function Sparkline({ points, color, height = 28, width = 88 }) {
  const t = useChartTheme()
  const stroke = color || t.accent
  if (!points || points.length < 2) return null
  const max = Math.max(1, ...points)
  const min = Math.min(...points)
  const span = Math.max(1, max - min)
  const step = width / (points.length - 1)
  const y = (v) => height - 3 - ((v - min) / span) * (height - 6)
  const d = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const last = points[points.length - 1]
  return (
    <svg width={width} height={height} className="overflow-visible shrink-0" aria-hidden>
      <path d={d} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
      <circle cx={(points.length - 1) * step} cy={y(last)} r="3" fill={stroke} stroke={t.surface} strokeWidth="1.5" />
    </svg>
  )
}

// Single-series line + 10% area wash with crosshair tooltip. One series, so
// no legend — the panel title names it.
export function TrendChart({ data, xKey = 'date', yKey = 'revenue', height = 220, money = true, sym = '₹', tooltipExtras }) {
  const t = useChartTheme()
  const wrapRef = useRef(null)
  const [hover, setHover] = useState(null) // index
  const pad = { l: 44, r: 14, t: 12, b: 22 }
  const width = 720 // viewBox width; scales responsively

  const values = data.map((d) => d[yKey] || 0)
  const max = Math.max(1, ...values)
  const ticks = niceTicks(max)
  const tickMax = ticks[ticks.length - 1]
  const innerW = width - pad.l - pad.r
  const innerH = height - pad.t - pad.b
  const x = (i) => pad.l + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW)
  const y = (v) => pad.t + innerH - (v / tickMax) * innerH

  if (!data.length) return <EmptyNote text="No data in this window yet." />

  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const area = `${line} L${x(data.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`
  // Sparse x labels: aim for ~6
  const every = Math.max(1, Math.ceil(data.length / 6))

  const onMove = (e) => {
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect) return
    const px = ((e.clientX - rect.left) / rect.width) * width
    const i = Math.round(((px - pad.l) / innerW) * (data.length - 1))
    setHover(Math.min(data.length - 1, Math.max(0, i)))
  }
  const h = hover != null ? data[hover] : null

  return (
    <div ref={wrapRef} className="relative" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto block">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={width - pad.r} y1={y(v)} y2={y(v)} stroke={t.grid} strokeWidth="1" />
            <text x={pad.l - 8} y={y(v) + 3} textAnchor="end" fontSize="10" fill={t.muted} style={{ fontVariantNumeric: 'tabular-nums' }}>
              {fmtCompact(v, money ? sym : '')}
            </text>
          </g>
        ))}
        <line x1={pad.l} x2={width - pad.r} y1={y(0)} y2={y(0)} stroke={t.axis} strokeWidth="1" />
        <path d={area} fill={t.accent} opacity="0.1" />
        <path d={line} fill="none" stroke={t.accent} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) =>
          i % every === 0 || i === data.length - 1 ? (
            <text key={i} x={x(i)} y={height - 6} textAnchor="middle" fontSize="10" fill={t.muted}>
              {String(d[xKey]).slice(5)}
            </text>
          ) : null,
        )}
        {hover != null && (
          <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={y(0)} stroke={t.axis} strokeWidth="1" />
        )}
        {/* end-dot with surface ring; hover dot rides the crosshair */}
        <circle cx={x(data.length - 1)} cy={y(values[values.length - 1])} r="4" fill={t.accent} stroke={t.surface} strokeWidth="2" />
        {hover != null && (
          <circle cx={x(hover)} cy={y(values[hover])} r="4.5" fill={t.accent} stroke={t.surface} strokeWidth="2" />
        )}
      </svg>
      {h && (
        <ChartTooltip xPct={(x(hover) / width) * 100}>
          <div className="font-semibold">{h[xKey]}</div>
          <div style={{ fontVariantNumeric: 'tabular-nums' }}>{money ? fmtMoney(h[yKey], sym) : fmtNum(h[yKey])}</div>
          {tooltipExtras?.(h)}
        </ChartTooltip>
      )}
    </div>
  )
}

// Column chart (hour-of-day). Single hue — magnitude is the job.
export function ColumnChart({ data, xKey = 'label', yKey = 'value', height = 180, money = false, sym = '₹', xEvery = 3 }) {
  const t = useChartTheme()
  const [hover, setHover] = useState(null)
  const pad = { l: 36, r: 8, t: 10, b: 20 }
  const width = 720
  const values = data.map((d) => d[yKey] || 0)
  const max = Math.max(1, ...values)
  const ticks = niceTicks(max)
  const tickMax = ticks[ticks.length - 1]
  const innerW = width - pad.l - pad.r
  const innerH = height - pad.t - pad.b
  const band = innerW / Math.max(1, data.length)
  const barW = Math.min(24, band - 2) // ≤24px thick, 2px surface gap between neighbours
  const y = (v) => pad.t + innerH - (v / tickMax) * innerH

  if (!data.length) return <EmptyNote text="No data in this window yet." />
  const h = hover != null ? data[hover] : null

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto block">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={width - pad.r} y1={y(v)} y2={y(v)} stroke={t.grid} strokeWidth="1" />
            <text x={pad.l - 6} y={y(v) + 3} textAnchor="end" fontSize="10" fill={t.muted} style={{ fontVariantNumeric: 'tabular-nums' }}>
              {fmtCompact(v, money ? sym : '')}
            </text>
          </g>
        ))}
        <line x1={pad.l} x2={width - pad.r} y1={y(0)} y2={y(0)} stroke={t.axis} strokeWidth="1" />
        {data.map((d, i) => {
          const v = d[yKey] || 0
          const bx = pad.l + i * band + (band - barW) / 2
          const by = y(v)
          const bh = Math.max(v > 0 ? 2 : 0, y(0) - by)
          return (
            <g key={i}>
              {/* rounded data-end, square baseline */}
              {bh > 0 && (
                <path
                  d={`M${bx},${y(0)} L${bx},${by + 4} Q${bx},${by} ${bx + 4},${by} L${bx + barW - 4},${by} Q${bx + barW},${by} ${bx + barW},${by + 4} L${bx + barW},${y(0)} Z`}
                  fill={t.accent}
                  opacity={hover == null || hover === i ? 1 : 0.45}
                />
              )}
              {/* hit target wider than the mark */}
              <rect
                x={pad.l + i * band}
                y={pad.t}
                width={band}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
              {i % xEvery === 0 && (
                <text x={bx + barW / 2} y={height - 5} textAnchor="middle" fontSize="10" fill={t.muted}>
                  {d[xKey]}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      {h && (
        <ChartTooltip xPct={((pad.l + hover * band + band / 2) / width) * 100}>
          <div className="font-semibold">{h[xKey]}</div>
          <div style={{ fontVariantNumeric: 'tabular-nums' }}>{money ? fmtMoney(h[yKey], sym) : `${fmtNum(h[yKey])} orders`}</div>
          {h.revenue != null && !money && <div className="opacity-80">{fmtMoney(h.revenue, sym)}</div>}
        </ChartTooltip>
      )}
    </div>
  )
}

// Donut for part-to-whole. Segments get a 2px surface-colour gap; the legend
// (always present, ≥2 series) carries labels + values so no reading is
// colour-alone. `items`: [{ label, value, color, sub }]
export function DonutChart({ items, centerLabel, centerValue, size = 168 }) {
  const t = useChartTheme()
  const [hover, setHover] = useState(null)
  const total = items.reduce((s, x) => s + x.value, 0)
  const r = size / 2 - 10
  const c = size / 2
  const strokeW = 26
  if (!total) return <EmptyNote text="Nothing recorded in this window yet." />

  const positive = items.filter((x) => x.value > 0)
  const segs = positive.map((x, i) => {
    const before = positive.slice(0, i).reduce((s, y) => s + y.value, 0)
    const start = (before / total) * 2 * Math.PI - Math.PI / 2
    const end = ((before + x.value) / total) * 2 * Math.PI - Math.PI / 2
    return { ...x, start, end }
  })

  const arc = (start, end) => {
    const large = end - start > Math.PI ? 1 : 0
    const x1 = c + r * Math.cos(start)
    const y1 = c + r * Math.sin(start)
    const x2 = c + r * Math.cos(end)
    const y2 = c + r * Math.sin(end)
    return `M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2}`
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          {segs.length === 1 ? (
            <circle
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke={segs[0].color}
              strokeWidth={strokeW}
              onMouseEnter={() => setHover(0)}
              onMouseLeave={() => setHover(null)}
            />
          ) : (
            segs.map((s, i) => (
              <path
                key={s.label}
                d={arc(s.start, s.end)}
                fill="none"
                stroke={s.color}
                strokeWidth={hover === i ? strokeW + 4 : strokeW}
                opacity={hover == null || hover === i ? 1 : 0.4}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                style={{ transition: 'stroke-width 120ms, opacity 120ms', cursor: 'default' }}
              />
            ))
          )}
          {/* 2px surface gaps between segments */}
          {segs.length > 1 &&
            segs.map((s) => (
              <line
                key={`gap-${s.label}`}
                x1={c + (r - strokeW) * Math.cos(s.start)}
                y1={c + (r - strokeW) * Math.sin(s.start)}
                x2={c + (r + strokeW) * Math.cos(s.start)}
                y2={c + (r + strokeW) * Math.sin(s.start)}
                stroke={t.surface}
                strokeWidth="2"
                pointerEvents="none"
              />
            ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <div className="text-lg font-bold leading-tight" style={{ color: t.ink }}>
            {hover != null ? `${Math.round((segs[hover].value / total) * 100)}%` : centerValue}
          </div>
          <div className="text-[10px] uppercase tracking-widest" style={{ color: t.muted }}>
            {hover != null ? segs[hover].label : centerLabel}
          </div>
        </div>
      </div>
      <ul className="flex-1 w-full space-y-2 min-w-0">
        {items.map((x) => {
          const pct = total ? Math.round((x.value / total) * 100) : 0
          const segIdx = segs.findIndex((s) => s.label === x.label)
          return (
            <li
              key={x.label}
              className="flex items-center gap-2 text-sm"
              onMouseEnter={() => segIdx >= 0 && setHover(segIdx)}
              onMouseLeave={() => setHover(null)}
            >
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: x.color }} />
              <span className="font-semibold truncate" style={{ color: t.ink }}>{x.label}</span>
              <span className="ml-auto tabular-nums text-xs" style={{ color: t.muted }}>
                {x.sub} · {pct}%
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// Horizontal labeled bar list — magnitude comparison for nominal categories,
// so every bar wears the same hue; the label + value ride each row (this is
// also the contrast-relief channel for the palette).
export function BarList({ items, valueFmt = fmtNum, color, maxBars = 10 }) {
  const t = useChartTheme()
  const rows = items.slice(0, maxBars)
  const max = Math.max(1, ...rows.map((x) => x.value))
  if (!rows.length) return <EmptyNote text="Nothing to show in this window yet." />
  return (
    <ul className="space-y-2.5">
      {rows.map((x) => (
        <li key={x.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-semibold truncate" style={{ color: t.ink }}>{x.label}</span>
            <span className="tabular-nums text-xs shrink-0" style={{ color: t.muted }}>
              {valueFmt(x.value)}
              {x.sub ? <span className="opacity-75"> · {x.sub}</span> : null}
            </span>
          </div>
          <div className="mt-1 h-2 rounded-full overflow-hidden" style={{ background: t.grid }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.max(2, (x.value / max) * 100)}%`, background: x.color || color || t.accent }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

// Weekday × hour heatmap — sequential single-hue ramp (saffron), light→dark
// with magnitude; anchor flips in dark mode so "near zero" recedes into the
// surface in both themes.
export function HourHeatmap({ matrix, weekdays }) {
  const t = useChartTheme()
  const [hover, setHover] = useState(null)
  const max = Math.max(1, ...matrix.flat())
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const cellColor = (v) => {
    if (!v) return t.isDark ? 'rgba(254,240,217,0.06)' : 'rgba(105,59,34,0.06)'
    const p = v / max
    const stops = t.isDark
      ? ['#7c2d12', '#9a3412', '#c2410c', '#ea580c', '#fb923c']
      : ['#fed7aa', '#fdba74', '#fb923c', '#ea580c', '#c2410c']
    return stops[Math.min(stops.length - 1, Math.floor(p * stops.length))]
  }
  const fmtHour = (h) => `${((h + 11) % 12) + 1}${h < 12 ? 'am' : 'pm'}`
  return (
    <div className="relative overflow-x-auto">
      <div className="min-w-[560px]">
        <div className="grid" style={{ gridTemplateColumns: `36px repeat(24, 1fr)` }}>
          <div />
          {hours.map((h) => (
            <div key={h} className="text-center text-[9px] pb-1" style={{ color: t.muted }}>
              {h % 3 === 0 ? fmtHour(h) : ''}
            </div>
          ))}
          {matrix.map((row, d) => (
            <HeatmapRow key={d} label={weekdays[d]} labelColor={t.muted}>
              {row.map((v, h) => (
                <div
                  key={h}
                  className="aspect-square m-[1px] rounded-[3px] cursor-default"
                  style={{ background: cellColor(v) }}
                  onMouseEnter={() => setHover({ d, h, v })}
                  onMouseLeave={() => setHover(null)}
                  title={`${weekdays[d]} ${fmtHour(h)} — ${v} order${v === 1 ? '' : 's'}`}
                />
              ))}
            </HeatmapRow>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-end gap-1.5 text-[10px]" style={{ color: t.muted }}>
          Less
          {[0.15, 0.4, 0.65, 0.9].map((p) => (
            <span key={p} className="h-2.5 w-2.5 rounded-[3px] inline-block" style={{ background: cellColor(Math.ceil(p * max)) }} />
          ))}
          More
          {hover && (
            <span className="ml-3 font-semibold tabular-nums" style={{ color: t.ink }}>
              {weekdays[hover.d]} {fmtHour(hover.h)} · {hover.v} orders
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function HeatmapRow({ label, labelColor, children }) {
  return (
    <>
      <div className="text-[10px] flex items-center pr-1 justify-end font-semibold" style={{ color: labelColor }}>
        {label}
      </div>
      {children}
    </>
  )
}

function ChartTooltip({ xPct, children }) {
  const t = useChartTheme()
  const left = Math.min(86, Math.max(6, xPct))
  return (
    <div
      className="absolute top-1 z-10 pointer-events-none rounded-xl px-3 py-2 text-xs shadow-lg border"
      style={{
        left: `${left}%`,
        transform: 'translateX(-50%)',
        background: t.isDark ? '#1a0e08' : '#ffffff',
        borderColor: t.grid,
        color: t.ink,
      }}
    >
      {children}
    </div>
  )
}

export function EmptyNote({ text }) {
  const t = useChartTheme()
  return (
    <div className="py-8 text-center text-sm" style={{ color: t.muted }}>
      {text}
    </div>
  )
}
