import { useState } from 'react'
import { applyGoals } from '../../services/goalsService'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../contexts/ToastContext'
import './goals.css'

export default function GoalsSetupBanner({ onActivated }) {
  const [loading, setLoading] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const toast = useToast()

  if (dismissed) return null

  async function handleActivate() {
    if (loading) return
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/goals-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!data.goals?.length) throw new Error(data.error ?? 'Falha ao gerar metas')

      await applyGoals(data.goals)
      toast.success('Metas ativadas!')
      onActivated?.()
    } catch (err) {
      toast.error(`Erro: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="goals-setup-banner">
      <div className="goals-setup-left">
        <span className="goals-setup-icon">🎯</span>
        <div>
          <div className="goals-setup-title">Ativar sistema de metas</div>
          <div className="goals-setup-sub">A IA cria metas baseadas no seu perfil e hábitos</div>
        </div>
      </div>
      <div className="goals-setup-actions">
        <button className="btn btn-ghost btn-icon" onClick={() => setDismissed(true)} aria-label="Dispensar" style={{ fontSize: 12, padding: '4px 8px' }}>
          Agora não
        </button>
        <button className="btn btn-primary" onClick={handleActivate} disabled={loading} style={{ fontSize: 13, padding: '6px 14px' }}>
          {loading ? 'Gerando...' : 'Ativar'}
        </button>
      </div>
    </div>
  )
}
