import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

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
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
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
    }
  }

  useEffect(() => {
    // Check active session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        let prof = await fetchProfile(currentUser.id)
        if (!prof) {
          prof = await createProfile(currentUser.id, currentUser.email)
        }
        setProfile(prof)
        sendAuthToSW(session, prof?.timezone)
      } else {
        sendAuthToSW(session, null)
      }

      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          let prof = await fetchProfile(currentUser.id)
          if (!prof) {
            prof = await createProfile(currentUser.id, currentUser.email)
          }
          setProfile(prof)
          sendAuthToSW(session, prof?.timezone)
        } else {
          setProfile(null)
          sendAuthToSW(session, null)
        }

        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
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
