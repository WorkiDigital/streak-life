import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { HabitsProvider } from './contexts/HabitsContext'
import { ToastProvider } from './contexts/ToastContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const HabitsPage = lazy(() => import('./pages/HabitsPage'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const ProgressPage = lazy(() => import('./pages/ProgressPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

function PageLoader() {
  return <div className="page-loader" aria-label="Carregando" />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <HabitsProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />

                <Route
                  path="/onboarding"
                  element={
                    <ProtectedRoute>
                      <OnboardingPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  element={
                    <ProtectedRoute requireProfile>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/habits" element={<HabitsPage />} />
                  <Route path="/chat" element={<ChatPage />} />
                  <Route path="/progress" element={<ProgressPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </HabitsProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
