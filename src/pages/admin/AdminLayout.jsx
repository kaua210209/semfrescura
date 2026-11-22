import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { Spinner } from '../../components/admin.jsx'

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    ;[0, 0.28, 0.56].forEach((t, i) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.frequency.value = i % 2 ? 1040 : 780
      o.connect(g)
      g.connect(ctx.destination)
      g.gain.setValueAtTime(0.3, ctx.currentTime + t)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.24)
      o.start(ctx.currentTime + t)
      o.stop(ctx.currentTime + t + 0.26)
    })
  } catch {
    /* sem áudio */
  }
}

const TABS = [
  ['/admin', 'Pedidos', true],
  ['/admin/cardapio', 'Cardápio'],
  ['/admin/destaques', 'Destaques'],
  ['/admin/carrossel', 'Carrossel'],
  ['/admin/avaliacoes', 'Avaliações'],
  ['/admin/relatorios', 'Relatórios'],
  ['/admin/configuracoes', 'Configurações'],
]

export default function AdminLayout() {
  const { session, isAdmin, loading, signOut } = useAuth()
  const { settings } = useSettings()
  const nav = useNavigate()
  const [orders, setOrders] = useState([])
  const [toast, setToast] = useState(null)
  const [notifPerm, setNotifPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'denied')
  const toastTimer = useRef(null)

  const loadOrders = useCallback(async () => {
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(500)
    if (data) setOrders(data)
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    loadOrders()

    const ch = supabase
      .channel('orders-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const o = payload.new
          setOrders((prev) => [o, ...prev.filter((x) => x.id !== o.id)])
          beep()
          setToast(o)
          clearTimeout(toastTimer.current)
          toastTimer.current = setTimeout(() => setToast(null), 12000)
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification(`Novo pedido #${o.number}`, { body: `${o.customer_name} — ${o.mode === 'entrega' ? 'Entrega' : 'Retirada'}` })
          }
        } else if (payload.eventType === 'UPDATE') {
          setOrders((prev) => prev.map((x) => (x.id === payload.new.id ? payload.new : x)))
        } else if (payload.eventType === 'DELETE') {
          setOrders((prev) => prev.filter((x) => x.id !== payload.old.id))
        }
      })
      .subscribe()

    const onVisible = () => document.visibilityState === 'visible' && loadOrders()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      supabase.removeChannel(ch)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [isAdmin, loadOrders])

  const pending = orders.filter((o) => o.status === 'aguardando_confirmacao').length

  useEffect(() => {
    document.title = pending > 0 ? `(${pending}) Pedidos · ${settings.name}` : `Painel · ${settings.name}`
  }, [pending, settings.name])

  if (loading) return <div className="min-h-screen bg-neutral-100"><Spinner /></div>
  if (!session) return <Navigate to="/admin/login" replace />
  if (!isAdmin) return <Navigate to="/admin/login" replace />

  async function enableAlerts() {
    beep() // também libera o áudio do navegador
    if (typeof Notification !== 'undefined') setNotifPerm(await Notification.requestPermission())
  }

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900">
      <header className="bg-brand-800 text-cream">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/admin" className="font-display text-2xl">
            {settings.name} · Painel
          </Link>
          <div className="flex items-center gap-2">
            {notifPerm !== 'granted' && (
              <button onClick={enableAlerts} className="btn btn-primary btn-sm">
                Ativar alertas
              </button>
            )}
            <Link to="/" target="_blank" className="btn btn-outline btn-sm hidden sm:inline-flex">
              Ver site
            </Link>
            <button
              onClick={async () => {
                await signOut()
                nav('/admin/login')
              }}
              className="btn btn-outline btn-sm"
            >
              Sair
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3">
          {TABS.map(([to, label, end]) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `relative shrink-0 rounded-t-lg px-4 py-2 text-sm font-bold ${isActive ? 'bg-neutral-100 text-brand-800' : 'text-cream/80 hover:text-cream'}`
              }
            >
              {label}
              {to === '/admin' && pending > 0 && (
                <span className="ml-1.5 rounded-full bg-accent px-1.5 py-0.5 text-[11px] text-brand-950">{pending}</span>
              )}
            </NavLink>
          ))}
        </nav>
      </header>

      {toast && (
        <button
          onClick={() => {
            setToast(null)
            nav('/admin')
          }}
          className="fixed top-3 left-1/2 z-50 w-[92%] max-w-md -translate-x-1/2 animate-pulse rounded-xl bg-accent p-4 text-left font-bold text-brand-950 shadow-2xl"
        >
          🔔 Novo pedido #{toast.number} — {toast.customer_name}
        </button>
      )}

      <main className="mx-auto max-w-6xl p-4">
        <Outlet context={{ orders, setOrders, reloadOrders: loadOrders }} />
      </main>
    </div>
  )
}
