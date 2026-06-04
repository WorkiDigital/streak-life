import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LogIn, UserPlus, Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react'
import './LoginPage.css'

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || '/'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isSignUp) {
        await signUp(email, password)
        setSuccess(true)
      } else {
        await signIn(email, password)
        navigate(from, { replace: true })
      }
    } catch (err) {
      const messages = {
        'Invalid login credentials': 'Email ou senha incorretos.',
        'User already registered': 'Este email já está cadastrado.',
        'Password should be at least 6 characters': 'A senha precisa ter no mínimo 6 caracteres.',
        'Unable to validate email address: invalid format': 'Formato de email inválido.',
      }
      setError(messages[err.message] || err.message || 'Erro ao autenticar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="login-page">
        <div className="login-bg-pattern" />
        <div className="login-container">
          <div className="login-card glass-card">
            <div className="login-success">
              <div className="login-success-icon animate-check-pop">✅</div>
              <h2>Conta criada!</h2>
              <p className="text-secondary">
                Verifique seu email para confirmar o cadastro. Depois volte aqui para entrar.
              </p>
              <button
                className="btn btn-primary btn-full btn-lg"
                onClick={() => { setIsSignUp(false); setSuccess(false) }}
              >
                Ir para Login
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-bg-pattern" />

      <div className="login-container">
        <div className="login-hero">
          <span className="login-logo-icon">🌱</span>
          <h1 className="login-logo-text">Streak Life</h1>
          <p className="login-tagline">
            Consistência vence intensidade.
            <br />
            Acompanhe seus hábitos com IA.
          </p>
        </div>

        <div className="login-card glass-card">
          <div className="login-tabs">
            <button
              className={`login-tab ${!isSignUp ? 'active' : ''}`}
              onClick={() => { setIsSignUp(false); setError('') }}
            >
              <LogIn size={16} />
              Entrar
            </button>
            <button
              className={`login-tab ${isSignUp ? 'active' : ''}`}
              onClick={() => { setIsSignUp(true); setError('') }}
            >
              <UserPlus size={16} />
              Criar conta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="input-group">
              <label className="input-label" htmlFor="login-email">Email</label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input
                  id="login-email"
                  type="email"
                  className={`input input-padded ${error ? 'input-error' : ''}`}
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="login-password">Senha</label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`input input-padded ${error ? 'input-error' : ''}`}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  className="input-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="login-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading}
            >
              {loading ? (
                <Loader2 size={20} className="spin" />
              ) : isSignUp ? (
                <>
                  <UserPlus size={18} />
                  Criar conta
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  Entrar
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
