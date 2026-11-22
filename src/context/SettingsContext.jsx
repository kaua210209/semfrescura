import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

const Ctx = createContext({ settings: { name: 'Sem Frescura' }, reload: () => {} })

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({ name: 'Sem Frescura', phone: '', pix_enabled: true })

  const reload = useCallback(async () => {
    const { data } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle()
    if (data) setSettings(data)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  useEffect(() => {
    if (settings.name) document.title = settings.name
  }, [settings.name])

  return <Ctx.Provider value={{ settings, reload }}>{children}</Ctx.Provider>
}

export const useSettings = () => useContext(Ctx)
