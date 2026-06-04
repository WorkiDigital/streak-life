import { useState, memo, useCallback } from 'react'
import { format, parseISO, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import './HabitHeatmap.css'

const STATUS_MAP = {
  done: { label: 'Feito', className: 'cell-done' },
  missed: { label: 'Não registrado', className: 'cell-missed' },
  pending: { label: 'Pendente', className: 'cell-pending' },
  future: { label: 'Futuro', className: 'cell-future' },
}

// Isolated cell — only re-renders when its own data changes
const HeatmapCell = memo(function HeatmapCell({ cell, habit, rowIdx, colIdx, totalDates, onEnter, onLeave }) {
  const statusInfo = STATUS_MAP[cell.status] || STATUS_MAP.future
  const delay = (rowIdx * totalDates + colIdx) * 8
  const label = `${habit.habitName} — ${cell.date} — ${statusInfo.label}${cell.value ? ` — ${cell.value}` : ''}${cell.nota ? ` — ${cell.nota}` : ''}`
  return (
    <div
      className={`heatmap-cell ${statusInfo.className}`}
      style={{ animationDelay: `${Math.min(delay, 600)}ms` }}
      onMouseEnter={() => onEnter({ cell, habit })}
      onMouseLeave={onLeave}
      onTouchStart={() => onEnter({ cell, habit })}
      onTouchEnd={() => setTimeout(onLeave, 2000)}
      role="gridcell"
      aria-label={label}
      tabIndex={0}
      onFocus={() => onEnter({ cell, habit })}
      onBlur={onLeave}
    />
  )
})

// Tooltip is a separate component so cell grid never re-renders on hover
function HeatmapTooltip({ tooltip }) {
  if (!tooltip) return null
  return (
    <div className="heatmap-tooltip" role="tooltip" aria-live="polite">
      <span className="heatmap-tooltip-habit">
        {tooltip.habit.habitIcon} {tooltip.habit.habitName}
      </span>
      <span className="heatmap-tooltip-date">
        {format(parseISO(tooltip.cell.date), "d 'de' MMMM", { locale: ptBR })}
      </span>
      <span className={`heatmap-tooltip-status ${STATUS_MAP[tooltip.cell.status]?.className}`}>
        {STATUS_MAP[tooltip.cell.status]?.label}
      </span>
      {tooltip.cell.value && (
        <span className="heatmap-tooltip-valor">{tooltip.cell.value}</span>
      )}
      {tooltip.cell.nota && (
        <span className="heatmap-tooltip-nota">{tooltip.cell.nota}</span>
      )}
    </div>
  )
}

export default memo(function HabitHeatmap({ matrix = [], dates = [] }) {
  const [tooltip, setTooltip] = useState(null)
  const handleEnter = useCallback((data) => setTooltip(data), [])
  const handleLeave = useCallback(() => setTooltip(null), [])

  if (!matrix.length) {
    return (
      <div className="heatmap-empty">
        <p className="text-secondary text-sm">Nenhum hábito configurado ainda.</p>
      </div>
    )
  }

  return (
    <div className="heatmap-wrapper">
      <div className="heatmap-grid">
        {/* Habit name column */}
        <div className="heatmap-labels">
          <div className="heatmap-corner" />
          {matrix.map(row => (
            <div key={row.habitId} className="heatmap-habit-label">
              <span className="heatmap-habit-icon" aria-hidden="true">{row.habitIcon}</span>
              <span className="heatmap-habit-name">{row.habitName}</span>
            </div>
          ))}
        </div>

        {/* Scrollable cells area */}
        <div className="heatmap-scroll-area">
          {/* Date headers */}
          <div className="heatmap-date-row" aria-hidden="true">
            {dates.map((date, i) => {
              const dateStr = format(date, 'yyyy-MM-dd')
              const isTod = isToday(date)
              const showLabel = i === 0 || i === dates.length - 1 || i % 5 === 0 || dates.length <= 14
              return (
                <div key={dateStr} className={`heatmap-date-label ${isTod ? 'today' : ''}`}>
                  {showLabel ? format(date, 'd', { locale: ptBR }) : ''}
                </div>
              )
            })}
          </div>

          {/* Habit rows */}
          {matrix.map((row, rowIdx) => (
            <div key={row.habitId} className="heatmap-row" role="row" aria-label={row.habitName}>
              {row.cells.map((cell, colIdx) => (
                <HeatmapCell
                  key={cell.date}
                  cell={cell}
                  habit={row}
                  rowIdx={rowIdx}
                  colIdx={colIdx}
                  totalDates={dates.length}
                  onEnter={handleEnter}
                  onLeave={handleLeave}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <HeatmapTooltip tooltip={tooltip} />

      {/* Legend */}
      <div className="heatmap-legend" aria-label="Legenda do mapa">
        <span className="heatmap-legend-item">
          <span className="heatmap-legend-cell cell-done" aria-hidden="true" />
          Feito
        </span>
        <span className="heatmap-legend-item">
          <span className="heatmap-legend-cell cell-missed" aria-hidden="true" />
          Não registrado
        </span>
        <span className="heatmap-legend-item">
          <span className="heatmap-legend-cell cell-pending" aria-hidden="true" />
          Pendente
        </span>
        <span className="heatmap-legend-item">
          <span className="heatmap-legend-cell cell-future" aria-hidden="true" />
          Futuro
        </span>
      </div>
    </div>
  )
})
