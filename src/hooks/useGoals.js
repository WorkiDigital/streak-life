import { useState, useEffect, useCallback } from 'react'
import { getDashboard } from '../services/goalsService'

export function useGoals() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const result = await getDashboard()
      setData(result)
    } catch {
      // silencia — goals são opcionais
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return {
    loading,
    goalsEnabled: data?.goals_enabled ?? false,
    weeklyGoal: data?.weekly_goal ?? null,
    goodDays: data?.good_days ?? 0,
    activeGoals: data?.goals ?? [],
    categoryProgress: data?.category_progress ?? {},
    threshold: data?.threshold ?? 0.7,
    refresh,
  }
}
