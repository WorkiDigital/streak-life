import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, Loader2, Send, Sparkles, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useHabits } from '../contexts/HabitsContext'
import { useToast } from '../contexts/ToastContext'
import './ChatPage.css'

function isTempMessage(message) {
  return String(message?.id || '').startsWith('temp-')
}

function mergeMessageList(current, incoming, { dropTemps = false } = {}) {
  const byId = new Map()
  const base = dropTemps ? current.filter(message => !isTempMessage(message)) : current

  for (const message of base) {
    if (message?.id) byId.set(String(message.id), message)
  }

  for (const message of incoming) {
    if (message?.id) byId.set(String(message.id), message)
  }

  return Array.from(byId.values())
}

export default function ChatPage({ onboardingMode = false }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bootstrapped = useRef(false)
  const scrollRef = useRef(null)

  const { user, profile, refreshProfile } = useAuth()
  const { refreshData } = useHabits()
  const toast = useToast()
  const navigate = useNavigate()

  const title = onboardingMode ? 'Onboarding com IA' : 'Chat'
  const subtitle = onboardingMode
    ? 'A IA monta seu plano e configura os lembretes.'
    : 'Converse, ajuste lembretes ou marque habitos por mensagem.'

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    [messages]
  )

  async function fetchMessages({ showLoading = false } = {}) {
    if (!user) return
    if (showLoading) setLoading(true)
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      toast.error('Erro ao carregar conversa')
      console.error(error)
    } else {
      const ordered = (data || []).reverse()
      setMessages(prev => showLoading ? ordered : mergeMessageList(prev, ordered, { dropTemps: true }))
    }
    if (showLoading) setLoading(false)
  }

  async function syncAfterAgent(applied = []) {
    await Promise.allSettled([refreshData(), refreshProfile()])
    const completedSetup = applied.some(item => item.type === 'SETUP')
    if (onboardingMode && completedSetup) {
      toast.success('Plano configurado! Seus lembretes ja estao ativos.')
      navigate('/', { replace: true })
    }
  }

  async function callAgent(text = '') {
    if (sending || !user) return
    const clean = text.trim()
    if (!clean && bootstrapped.current) return

    setSending(true)
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      const accessToken = sessionData?.session?.access_token
      if (!accessToken) throw new Error('Sessao expirada. Entre novamente para continuar.')

      if (clean) {
        setMessages(prev => mergeMessageList(prev, [
          {
            id: `temp-${Date.now()}`,
            user_id: user.id,
            role: 'user',
            content: clean,
            source: 'app',
            created_at: new Date().toISOString(),
          },
        ]))
      }

      const { data, error } = await supabase.functions.invoke('agent-chat', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: {
          message: clean,
          source: 'app',
          mode: onboardingMode ? 'onboarding' : 'chat',
        },
      })

      if (error) throw error
      if (data?.assistantMessage) {
        setMessages(prev => mergeMessageList(prev, [data.assistantMessage], { dropTemps: true }))
      }

      setInput('')
      await syncAfterAgent(data?.applied || [])
      await fetchMessages()
    } catch (error) {
      toast.error(error.message || 'Erro ao falar com a IA')
      console.error(error)
      setMessages(prev => prev.filter(item => !isTempMessage(item)))
    } finally {
      setSending(false)
      bootstrapped.current = true
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    callAgent(input)
  }

  useEffect(() => {
    fetchMessages({ showLoading: true })
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user || loading || bootstrapped.current) return
    if (onboardingMode && messages.length === 0) {
      callAgent('')
    }
  }, [user, loading, messages.length, onboardingMode]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [sortedMessages, sending])

  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `user_id=eq.${user.id}`,
        },
        payload => {
          if (payload.eventType === 'INSERT') {
            setMessages(prev => mergeMessageList(prev, [payload.new], { dropTemps: true }))
          }
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user])

  return (
    <div className={onboardingMode ? 'chat-shell onboarding-chat-shell' : 'chat-shell'}>
      <div className="container chat-page">
        <header className="chat-page-header">
          <div className="chat-title-row">
            <div className="chat-agent-icon">
              <Sparkles size={18} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{title}</h1>
              <p className="text-sm text-secondary">{subtitle}</p>
            </div>
          </div>
          {profile?.onboarding_completed && (
            <span className="badge badge-done">Plano ativo</span>
          )}
        </header>

        <section className="chat-window glass-card" ref={scrollRef} aria-live="polite">
          {loading ? (
            <div className="chat-loading">
              <Loader2 size={20} className="spin" />
              <span className="text-sm text-secondary">Carregando conversa...</span>
            </div>
          ) : sortedMessages.length === 0 && !sending ? (
            <div className="chat-empty">
              <Bot size={28} />
              <p className="text-sm text-secondary">Envie uma mensagem para comecar.</p>
            </div>
          ) : (
            sortedMessages.map(message => (
              <article
                key={message.id}
                className={`chat-message ${message.role === 'user' ? 'from-user' : 'from-agent'}`}
              >
                <div className="chat-message-avatar" aria-hidden="true">
                  {message.role === 'user' ? <User size={15} /> : <Bot size={15} />}
                </div>
                <div className="chat-bubble">
                  {message.content.split('\n').map((line, index) => (
                    <p key={index}>{line || '\u00a0'}</p>
                  ))}
                </div>
              </article>
            ))
          )}

          {sending && (
            <article className="chat-message from-agent">
              <div className="chat-message-avatar" aria-hidden="true">
                <Bot size={15} />
              </div>
              <div className="chat-bubble chat-typing">
                <Loader2 size={16} className="spin" />
                <span>Pensando...</span>
              </div>
            </article>
          )}
        </section>

        <form className="chat-composer" onSubmit={handleSubmit}>
          <textarea
            className="chat-input"
            rows={1}
            placeholder={onboardingMode ? 'Responda a pergunta da IA...' : 'Ex: feito, 45 min ou muda treino para 18h'}
            value={input}
            onChange={event => setInput(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                handleSubmit(event)
              }
            }}
            disabled={sending}
          />
          <button
            className="btn btn-primary btn-icon chat-send"
            type="submit"
            disabled={sending || !input.trim()}
            aria-label="Enviar mensagem"
          >
            {sending ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
          </button>
        </form>
      </div>
    </div>
  )
}
