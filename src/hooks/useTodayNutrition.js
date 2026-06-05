import { useEffect, useState, useCallback } from 'react'
import { getTodayNutrition } from '../services/nutritionService'

export function useTodayNutrition(date) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!date) {
      setData(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await getTodayNutrition(date)
      setData(result)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    load()
  }, [load])

  return { data, loading, error, refresh: load }
}
