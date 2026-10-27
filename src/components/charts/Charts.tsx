import { useId, useMemo } from 'react'
import type { YearStat } from '../../lib/types'
import { dateKey } from '../../lib/utils'
import { Ring } from '../ui/primitives'

function levelOf(count: number): number {
  if (!count) return 0
  if (count <= 2) return 1
  if (count <= 4) return 2
  if (count <= 8) return 3
  return 4
}

const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

export function Heatmap({
  activity,
  weeks = 12,
}: {
  activity: Record<string, number>
  weeks?: number
}) {
  const { cells, monthMarks, total } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = new Date(today)
    start.setDate(start.getDate() - (weeks * 7 - 1))
    const list: Array<{ key: string; count: number; level: number; label: string }> = []
    const marks: Array<{ column: number; label: string }> = []
    let lastMonth = -1
    let sum = 0
    for (let i = 0; i < weeks * 7; i += 1) {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      const key = dateKey(date)
      const count = activity[key] || 0
      sum += count
      list.push({
        key,
        count,
        level: levelOf(count),
        label: `${date.getMonth() + 1} 月 ${date.getDate()} 日 · ${count} 题`,
      })
      if (date.getDay() === 1 || i === 0) {
        const column = Math.floor(i / 7)
        if (date.getMonth() !== lastMonth && date.getDate() <= 7) {
          marks.push({ column, label: MONTH_LABELS[date.getMonth()] })
          lastMonth = date.getMonth()
        }
      }
    }
    return { cells: list, monthMarks: marks, total: sum }
  }, [activity, weeks])

  return (
    <div className="heatmap">
      <div className="heatmap-months" style={{ gridTemplateColumns: `repeat(${weeks}, var(--hm-cell))` }}>
        {monthMarks.map((mark) => (
          <span key={`${mark.label}-${mark.column}`} style={{ gridColumn: mark.column + 1 }}>
            {mark.label}
          </span>
        ))}
      </div>
      <div className="heatmap-body">
        <div className="heatmap-days" aria-hidden="true">
          <span>一</span>
          <span />
          <span>三</span>
          <span />
          <span>五</span>
          <span />
          <span>日</span>
        </div>
        <div
          className="heatmap-grid"
          style={{ gridTemplateColumns: `repeat(${weeks}, var(--hm-cell))` }}
          role="img"
          aria-label={`近 ${weeks} 周共练习 ${total} 题`}
        >
          {cells.map((cell) => (
            <span
              key={cell.key}
              className={`hm-cell hm-${cell.level}`}
              data-tip={cell.label}
              title={cell.label}
            />
          ))}
        </div>
      </div>
      <div className="heatmap-legend">
        <span>近 {weeks} 周 · {total} 题</span>
        <span className="legend-scale">
          少
          <i className="hm-cell hm-0" />
          <i className="hm-cell hm-1" />
          <i className="hm-cell hm-2" />
          <i className="hm-cell hm-3" />
          <i className="hm-cell hm-4" />
          多
        </span>
      </div>
    </div>
  )
}

export function TrendChart({ years }: { years: YearStat[] }) {
  const gradientId = useId().replace(/:/g, '')
  const points = years.filter((y) => y.accuracy !== null)
  const width = 720
  const height = 240
  const pad = { top: 18, right: 14, bottom: 30, left: 38 }
  const plotW = width - pad.left - pad.right
  const plotH = height - pad.top - pad.bottom

  if (points.length < 2) {
    return (
      <div className="trend-empty">
        <svg viewBox="0 0 720 210" aria-hidden="true">
          {[0, 25, 50, 75, 100].map((tick) => (
            <line
              key={tick}
              x1={38}
              x2={706}
              y1={18 + (1 - tick / 100) * 160}
              y2={18 + (1 - tick / 100) * 160}
              className="trend-grid"
            />
          ))}
          <path
            d="M38,150 C110,138 150,146 210,120 C270,94 320,116 380,88 C440,60 500,84 560,58 C620,34 670,46 706,30"
            className="trend-ghost"
            fill="none"
          />
          {[38, 150, 262, 374, 486, 598, 706].map((x, index) => (
            <circle key={x} cx={x} cy={[150, 138, 120, 94, 78, 58, 40][index]} r={3} className="trend-ghost-dot" />
          ))}
        </svg>
        <div className="trend-empty-copy">
          <strong>趋势还在等两个年份的数据</strong>
          <p>完成不同年份的真题后，这里会连成一条正确率曲线。</p>
        </div>
      </div>
    )
  }

  const x = (year: number) => {
    const min = years[0]?.year ?? year
    const max = years[years.length - 1]?.year ?? year
    return pad.left + ((year - min) / Math.max(1, max - min)) * plotW
  }
  const y = (accuracy: number) => pad.top + (1 - accuracy) * plotH
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.year)},${y(p.accuracy || 0)}`).join(' ')
  const area = `${line} L${x(points[points.length - 1].year)},${pad.top + plotH} L${x(points[0].year)},${pad.top + plotH} Z`

  return (
    <div className="trend-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="历年正确率趋势">
        <defs>
          <linearGradient id={`trend-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map((tick) => (
          <g key={tick}>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={y(tick / 100)}
              y2={y(tick / 100)}
              className="trend-grid"
            />
            <text x={pad.left - 10} y={y(tick / 100) + 4} className="trend-axis" textAnchor="end">
              {tick}
            </text>
          </g>
        ))}
        <path d={area} fill={`url(#trend-${gradientId})`} />
        <path d={line} className="trend-line" fill="none" />
        {points.map((point) => (
          <g key={point.year}>
            <circle
              cx={x(point.year)}
              cy={y(point.accuracy || 0)}
              r={3.4}
              className="trend-dot"
            >
              <title>{`${point.year} 年 · ${Math.round((point.accuracy || 0) * 100)}%（${point.graded} 题）`}</title>
            </circle>
          </g>
        ))}
        {years.map((year, index) =>
          index % 4 === 0 || index === years.length - 1 ? (
            <text
              key={year.year}
              x={x(year.year)}
              y={height - 8}
              className="trend-axis"
              textAnchor="middle"
            >
              {year.year}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  )
}

export function DonutStat({
  value,
  label,
  caption,
  tone = 'accent',
}: {
  value: number | null
  label: string
  caption: string
  tone?: 'accent' | 'jade'
}) {
  return (
    <div className="donut-stat">
      <Ring value={value ?? 0} size={72} stroke={6} tone={tone}>
        <strong>{value === null ? '—' : `${Math.round(value * 100)}%`}</strong>
      </Ring>
      <div>
        <span className="donut-label">{label}</span>
        <span className="donut-caption">{caption}</span>
      </div>
    </div>
  )
}
