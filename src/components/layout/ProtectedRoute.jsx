import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

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
        <style>{`
          .loading-screen {
            min-height: 100dvh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: var(--space-6);
            background: var(--color-bg-primary);
          }
          .loading-logo {
            display: flex;
            align-items: center;
            gap: var(--space-3);
          }
          .loading-icon {
            font-size: 2rem;
            animation: pulse-green 2s ease-in-out infinite;
          }
          .loading-text {
            font-size: var(--font-size-3xl);
            font-weight: var(--font-weight-extrabold);
            background: var(--gradient-primary);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          .loading-bar {
            width: 120px;
            height: 3px;
            background: var(--color-bg-tertiary);
            border-radius: var(--radius-full);
            overflow: hidden;
          }
          .loading-bar-fill {
            height: 100%;
            width: 40%;
            background: var(--gradient-primary);
            border-radius: var(--radius-full);
            animation: loading-slide 1.2s ease-in-out infinite;
          }
          @keyframes loading-slide {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(350%); }
          }
        `}</style>
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
