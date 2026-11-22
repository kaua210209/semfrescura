import { useCart } from '../context/CartContext.jsx'
import { brl } from '../lib/format.js'
import ProductImage from './ProductImage.jsx'

export default function ProductRow({ p }) {
  const { items, add, setQty } = useCart()
  const qty = items.find((i) => i.id === p.id)?.qty || 0
  const off = !p.available

  return (
    <li className={`flex gap-3 rounded-2xl bg-brand-900/70 p-3 ${off ? 'opacity-70' : ''}`}>
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="text-xl leading-tight text-cream">{p.name}</h3>
        {p.description && <p className="mt-1 text-sm leading-snug text-cream/70">{p.description}</p>}
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <span className="font-display text-xl text-accent">{brl(p.price)}</span>
          {off ? (
            <span className="rounded-full bg-black/40 px-3 py-1 text-xs font-bold tracking-wide text-cream/80 uppercase">Indisponível</span>
          ) : qty === 0 ? (
            <button onClick={() => add(p)} className="btn btn-primary btn-sm">
              Adicionar
            </button>
          ) : (
            <div className="flex items-center gap-1 rounded-lg bg-brand-950 p-1">
              <button onClick={() => setQty(p.id, qty - 1)} aria-label="Remover um" className="h-8 w-8 rounded-md bg-white/10 text-lg font-bold">
                −
              </button>
              <span className="w-7 text-center font-bold">{qty}</span>
              <button onClick={() => setQty(p.id, qty + 1)} aria-label="Adicionar um" className="h-8 w-8 rounded-md bg-accent text-lg font-bold text-brand-950">
                +
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="relative">
        <ProductImage src={p.image_url} name={p.name} className={`h-24 w-24 ${off ? 'grayscale' : ''}`} />
      </div>
    </li>
  )
}
