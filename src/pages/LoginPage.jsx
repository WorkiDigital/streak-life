import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LogIn, UserPlus, Mail, Lock, Loader2, Eye, EyeOff, Sprout, CheckCircle2 } from 'lucide-react'
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
  const emailVerified = new URLSearchParams(location.search).get('verified') === '1'

  function isStrongPassword(value) {
    const hasMinLength = value.length >= 8
    const hasUppercase = /[A-ZÀ-Ý]/.test(value)
    const hasSpecialChar = /[^A-Za-zÀ-ÿ0-9]/.test(value)

    return hasMinLength && hasUppercase && hasSpecialChar
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (isSignUp && !isStrongPassword(password)) {
      setError('A senha precisa ter no mínimo 8 caracteres, uma letra maiúscula e um caractere especial.')
      return
    }

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
        'User already registered': 'Este email ja esta cadastrado.',
        'Password should be at least 6 characters': 'A senha precisa ter no mínimo 8 caracteres, uma letra maiúscula e um caractere especial.',
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
              <div className="login-success-icon animate-check-pop">
                <CheckCircle2 size={28} strokeWidth={2.4} />
              </div>
              <h2>Conta criada!</h2>
              <p className="text-secondary">
                Enviamos um email bonito para você confirmar o cadastro. Depois da verificação, volte aqui para entrar.
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
          <Sprout className="login-logo-icon" size={48} strokeWidth={2.4} />
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
            {emailVerified && !isSignUp && (
              <div className="login-verified">
                Email confirmado. Agora entre para começar seu plano.
              </div>
            )}

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
                  placeholder={isSignUp ? 'Mínimo 8 caracteres, maiúscula e especial' : 'Sua senha'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={isSignUp ? 8 : 1}
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
