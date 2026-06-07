import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

function withTimeout(promise, ms = 8000, label = 'request') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(`${label} timeout`)), ms)
    }),
  ])
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch user profile from profiles table
  async function fetchProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error)
    }
    return data
  }

  // Create initial profile on first login
  async function createProfile(userId, email) {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        nome: email.split('@')[0], // Placeholder name
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating profile:', error)
      return null
    }
    return data
  }

  function sendAuthToSW(session, tz) {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.ready
      .then((registration) => {
        if (registration.active) {
          registration.active.postMessage({
            type: 'SET_SUPABASE_AUTH',
            access_token: session?.access_token || null,
            user_id: session?.user?.id || null,
            supabase_url: import.meta.env.VITE_SUPABASE_URL,
            supabase_anon_key: import.meta.env.VITE_SUPABASE_ANON_KEY,
            timezone: tz || 'America/Fortaleza',
          })
        }
      })
      .catch((error) => {
        console.warn('Unable to send auth to service worker:', error)
      })
  }

  function clearAuthFromSW() {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.ready
      .then((registration) => {
        registration.active?.postMessage({ type: 'CLEAR_SUPABASE_AUTH' })
      })
      .catch((error) => {
        console.warn('Unable to clear auth from service worker:', error)
      })
  }

  useEffect(() => {
    let mounted = true

    async function hydrateUserFromSession(session, source = 'auth') {
      const currentUser = session?.user ?? null

      if (!mounted) return
      setUser(currentUser)

      if (!currentUser) {
        setProfile(null)
        clearAuthFromSW()
        return
      }

      try {
        let prof = await withTimeout(
          fetchProfile(currentUser.id),
          8000,
          `fetchProfile:${source}`
        )

        if (!prof) {
          prof = await withTimeout(
            createProfile(currentUser.id, currentUser.email),
            8000,
            `createProfile:${source}`
          )
        }

        if (!mounted) return
        setProfile(prof)
        sendAuthToSW(session, prof?.timezone)
      } catch (error) {
        console.error('Auth profile hydration failed:', error)

        if (mounted) {
          setProfile(null)
        }
      }
    }

    async function initAuth() {
      setLoading(true)

      try {
        const { data } = await withTimeout(
          supabase.auth.getSession(),
          8000,
          'getSession'
        )

        await hydrateUserFromSession(data?.session, 'init')
      } catch (error) {
        console.error('Auth init failed:', error)

        if (mounted) {
          setUser(null)
          setProfile(null)
          clearAuthFromSW()
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setLoading(true)

        try {
          await hydrateUserFromSession(session, 'state-change')
        } catch (error) {
          console.error('Auth state change failed:', error)
        } finally {
          if (mounted) {
            setLoading(false)
          }
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function signUp(email, password) {
    const emailRedirectTo = `${window.location.origin}/login?verified=1`
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: {
          nome: email.split('@')[0],
        },
      },
    })
    if (error) throw error
    return data
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  async function signOut() {
    clearAuthFromSW()
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
    setProfile(null)
  }

  async function updateProfile(updates) {
    if (!user) return null

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw error
    setProfile(data)
    return data
  }

  async function refreshProfile() {
    if (!user) return null
    const data = await fetchProfile(user.id)
    setProfile(data)
    return data
  }

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    refreshProfile,
    isOnboarded: Boolean(profile?.onboarding_completed || (profile?.whatsapp && profile?.nome)),
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
