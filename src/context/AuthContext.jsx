import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    let cancelled = false
    async function check() {
      if (!session) {
        setIsAdmin(false)
        setLoading(false)
        return
      }
      setLoading(true)
      const { data } = await supabase.from('admin_users').select('user_id').eq('user_id', session.user.id).maybeSingle()
      if (!cancelled) {
        setIsAdmin(!!data)
        setLoading(false)
      }
    }
    check()
    return () => {
      cancelled = true
    }
  }, [session])

  // Primeira carga: aguarda a sessão ser lida antes de decidir
  const [booted, setBooted] = useState(false)
  useEffect(() => {
    supabase.auth.getSession().then(() => setBooted(true))
  }, [])

  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password })
  const signOut = () => supabase.auth.signOut()

  return (
    <Ctx.Provider value={{ session, isAdmin, loading: loading || !booted, signIn, signOut }}>{children}</Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
