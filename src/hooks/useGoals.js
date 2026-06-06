import { useState, useEffect, useCallback } from 'react'
import { getDashboard } from '../services/goalsService'

const FALLBACK = { goals_enabled: true, goals: [], weekly_goal: null, good_days: 0 }

export function useGoals() {
  const [data, setData] = useState(FALLBACK)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const result = await getDashboard()
      setData(result ?? FALLBACK)
    } catch (err) {
      console.error('[useGoals] erro ao buscar dashboard:', err?.message ?? err)
      setData(FALLBACK)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return {
    loading,
    // null = ainda carregando, false = desativado, true = ativo
    goalsEnabled: loading ? null : (data?.goals_enabled ?? false),
    weeklyGoal: data?.weekly_goal ?? null,
    goodDays: data?.good_days ?? 0,
    activeGoals: data?.goals ?? [],
    categoryProgress: data?.category_progress ?? {},
    threshold: data?.threshold ?? 0.7,
    refresh,
  }
}
