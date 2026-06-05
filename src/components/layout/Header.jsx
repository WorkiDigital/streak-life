import { User } from 'lucide-react'
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
            <span className="header-user-name text-sm font-semibold">
              {profile?.nome?.split(' ')[0] || 'Usuário'}
            </span>
          </div>
          <div className="header-avatar" aria-label="Usuário">
            <User size={20} strokeWidth={2.25} />
          </div>
        </div>
      </div>
    </header>
  )
}