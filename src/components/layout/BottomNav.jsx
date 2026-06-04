import { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { Home, CheckSquare, BarChart3, Settings } from 'lucide-react'
import { useHabits } from '../../contexts/HabitsContext'
import './BottomNav.css'

export default function BottomNav() {
  const { getTodayHabits, logs, schedules } = useHabits()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const todayHabits = useMemo(() => getTodayHabits(), [logs, schedules])
  const pendingCount = todayHabits.filter(h => h.status !== 'feito').length

  const navItems = [
    { to: '/', icon: Home, label: 'Início', badge: pendingCount },
    { to: '/habits', icon: CheckSquare, label: 'Hábitos' },
    { to: '/progress', icon: BarChart3, label: 'Progresso' },
    { to: '/settings', icon: Settings, label: 'Config' },
  ]

  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      <div className="bottom-nav-inner">
        {navItems.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `bottom-nav-item ${isActive ? 'active' : ''}`
            }
            aria-label={badge > 0 ? `${label} — ${badge} hábito${badge !== 1 ? 's' : ''} pendente${badge !== 1 ? 's' : ''}` : label}
          >
            <div className="bottom-nav-icon-wrap" aria-hidden="true">
              <Icon size={22} />
              {badge > 0 && (
                <span className="bottom-nav-badge">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </div>
            <span className="bottom-nav-label" aria-hidden="true">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
