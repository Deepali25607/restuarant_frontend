import { useMemo } from 'react'
import { useThemeStore } from '../../../store/useThemeStore'

// Chart palette — validated with the dataviz six-checks (CVD separation,
// lightness band, chroma floor, contrast) against the app's white / #2b1810
// card surfaces. Slot order is fixed: it is the colour-blind-safety
// mechanism, never re-sorted. Colours are assigned to ENTITIES (payment
// method, service type), never to rank, so filters don't repaint survivors.
export const SLOTS_LIGHT = ['#ea580c', '#4f46e5', '#059669', '#ec4899', '#ca8a04', '#0d9488']
export const SLOTS_DARK = ['#ea580c', '#6366f1', '#059669', '#ec4899', '#d97706', '#0d9488']

export function useChartTheme() {
  const theme = useThemeStore((s) => s.theme)
  const isDark = theme === 'dark'
  return useMemo(
    () => ({
      isDark,
      slots: isDark ? SLOTS_DARK : SLOTS_LIGHT,
      accent: '#ea580c',
      ink: isDark ? '#fef0d9' : '#2b1810',
      muted: isDark ? '#d6a877' : '#693b22',
      grid: isDark ? 'rgba(254,240,217,0.14)' : 'rgba(105,59,34,0.14)',
      axis: isDark ? 'rgba(254,240,217,0.28)' : 'rgba(105,59,34,0.28)',
      surface: isDark ? '#2b1810' : '#ffffff',
      good: isDark ? '#34d399' : '#047857',
      bad: isDark ? '#f87171' : '#b91c1c',
    }),
    [isDark],
  )
}

export const fmtNum = (n) => (n ?? 0).toLocaleString('en-IN')
export const fmtMoney = (n, sym = '₹') => `${sym}${fmtNum(Math.round(n ?? 0))}`
export const fmtCompact = (n, sym = '') => {
  const v = Math.abs(n ?? 0)
  if (v >= 10000000) return `${sym}${(n / 10000000).toFixed(1)}Cr`
  if (v >= 100000) return `${sym}${(n / 100000).toFixed(1)}L`
  if (v >= 1000) return `${sym}${(n / 1000).toFixed(1)}k`
  return `${sym}${Math.round(n ?? 0)}`
}

// Clean y-axis ticks: 0..niceMax in ~4 steps.
export function niceTicks(max) {
  if (max <= 0) return [0, 1]
  const raw = max / 3
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || raw
  const ticks = []
  for (let v = 0; v <= max + step * 0.999; v += step) ticks.push(Math.round(v))
  return ticks
}
