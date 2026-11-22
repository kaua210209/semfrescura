import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const Ctx = createContext(null)
const KEY = 'sf_cart'

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '[]')
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items))
    } catch {
      /* ignore */
    }
  }, [items])

  const value = useMemo(() => {
    const add = (p) =>
      setItems((prev) => {
        const found = prev.find((i) => i.id === p.id)
        if (found) return prev.map((i) => (i.id === p.id ? { ...i, qty: Math.min(50, i.qty + 1) } : i))
        return [...prev, { id: p.id, name: p.name, price: Number(p.price), image_url: p.image_url, qty: 1 }]
      })
    const setQty = (id, qty) =>
      setItems((prev) =>
        qty <= 0 ? prev.filter((i) => i.id !== id) : prev.map((i) => (i.id === id ? { ...i, qty: Math.min(50, qty) } : i))
      )
    const clear = () => setItems([])
    const total = items.reduce((s, i) => s + i.price * i.qty, 0)
    const count = items.reduce((s, i) => s + i.qty, 0)
    return { items, add, setQty, clear, total, count }
  }, [items])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useCart = () => useContext(Ctx)
