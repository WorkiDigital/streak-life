import { useAuth } from '../../contexts/AuthContext'
import './Header.css'

export default function Header() {
  const { profile } = useAuth()

  function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bom dia'
    if (hour < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  function getInitials(name) {
    if (!name) return '?'
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  return (
    <header className="header">
      <div className="header-inner container">
        <div className="header-brand">
          <span className="header-logo-icon">🌱</span>
          <span className="header-logo-text">Streak Life</span>
        </div>
        <div className="header-user">
          <div className="header-greeting">
            <span className="text-sm text-secondary">
              {getGreeting()},
            </span>
            <span className="text-sm font-semibold">
              {profile?.nome?.split(' ')[0] || 'Usuário'} 👋
            </span>
          </div>
          <div className="header-avatar" aria-label="Avatar do usuário">
            {getInitials(profile?.nome)}
          </div>
        </div>
      </div>
    </header>
  )
}
