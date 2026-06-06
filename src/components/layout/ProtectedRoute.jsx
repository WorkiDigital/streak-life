import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import './ProtectedRoute.css'

export default function ProtectedRoute({ children, requireProfile = false }) {
  const { user, profile, loading, isOnboarded } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-logo">
          <span className="loading-icon">🌱</span>
          <span className="loading-text">Streak Life</span>
        </div>
        <div className="loading-bar">
          <div className="loading-bar-fill"></div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requireProfile && !isOnboarded && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  return children
}
