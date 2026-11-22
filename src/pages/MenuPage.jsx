import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useCart } from '../context/CartContext.jsx'
import { CATEGORIES, brl } from '../lib/format.js'
import ProductRow from '../components/ProductRow.jsx'

export default function MenuPage() {
  const [products, setProducts] = useState(null)
  const { count, total } = useCart()
  const nav = useNavigate()
  const { hash } = useLocation()
  const lastOrder = (() => {
    try {
      return JSON.parse(localStorage.getItem('sf_orders') || '[]')[0]
    } catch {
      return null
    }
  })()

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('products').select('*').order('sort').order('name')
      setProducts(data || [])
    }
    load()
    const onVisible = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  useEffect(() => {
    if (products && hash) document.getElementById(hash.slice(1))?.scrollIntoView()
  }, [products, hash])

  if (!products) return <p className="p-8 text-center text-cream/70">Carregando cardápio…</p>

  const sections = CATEGORIES.map((c) => ({ ...c, list: products.filter((p) => p.category === c.id) })).filter((s) => s.list.length)

  return (
    <main className="mx-auto max-w-3xl pb-28">
      <div className="sticky top-0 z-30 bg-brand-800/95 px-4 pt-3 pb-2 backdrop-blur">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl">Cardápio</h1>
          {lastOrder && (
            <Link to={`/acompanhar/${lastOrder}`} className="text-sm font-semibold text-accent underline">
              Acompanhar último pedido
            </Link>
          )}
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' })}
              className="shrink-0 rounded-full border border-cream/40 px-4 py-1.5 font-display text-lg tracking-wide hover:bg-cream/10"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {sections.length === 0 && <p className="p-8 text-center text-cream/70">O cardápio ainda está sendo montado. Volte em breve!</p>}

      {sections.map((s) => (
        <section key={s.id} id={s.id} className="scroll-mt-28 px-4 pt-6">
          <h2 className="mb-3 text-3xl text-accent">{s.label}</h2>
          <ul className="space-y-3">
            {s.list.map((p) => (
              <ProductRow key={p.id} p={p} />
            ))}
          </ul>
        </section>
      ))}

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-40 px-4 md:bottom-4">
          <button onClick={() => nav('/checkout')} className="btn btn-primary mx-auto flex w-full max-w-3xl justify-between shadow-xl">
            <span>
              Ver pedido ({count} {count === 1 ? 'item' : 'itens'})
            </span>
            <span className="font-display text-xl">{brl(total)}</span>
          </button>
        </div>
      )}
    </main>
  )
}
