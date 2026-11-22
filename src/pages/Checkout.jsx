import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useCart } from '../context/CartContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { MODE, PAYMENT, brl, onlyDigits } from '../lib/format.js'

const SAVED = 'sf_customer'

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-cream/60">{label}</span>
      <span className="text-right font-semibold">{children}</span>
    </div>
  )
}

export default function Checkout() {
  const { items, total, setQty, clear } = useCart()
  const { settings } = useSettings()
  const nav = useNavigate()

  const saved = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(SAVED) || 'null')
    } catch {
      return null
    }
  }, [])

  const [form, setForm] = useState({
    name: saved?.name || '',
    phone: saved?.phone || '',
    address: saved?.address || '',
    mode: 'entrega',
    payment: 'dinheiro',
    notes: '',
  })
  const [step, setStep] = useState('form')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)
  const [hasSaved, setHasSaved] = useState(!!saved)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-4xl">Seu pedido está vazio</h1>
        <p className="mt-2 text-cream/70">Escolha alguns itens no cardápio para continuar.</p>
        <Link to="/pedido" className="btn btn-primary mt-6">
          Ver cardápio
        </Link>
      </main>
    )
  }

  function saveInfo() {
    localStorage.setItem(SAVED, JSON.stringify({ name: form.name, phone: form.phone, address: form.address }))
    setHasSaved(true)
    setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 2500)
  }
  function clearInfo() {
    localStorage.removeItem(SAVED)
    setHasSaved(false)
  }

  function review() {
    if (!form.name.trim()) return setErr('Informe seu nome.')
    if (onlyDigits(form.phone).length < 10) return setErr('Informe um telefone válido com DDD.')
    if (form.mode === 'entrega' && !form.address.trim()) return setErr('Informe o endereço de entrega.')
    setErr('')
    setStep('review')
    window.scrollTo(0, 0)
  }

  async function confirm() {
    setBusy(true)
    setErr('')
    const { data, error } = await supabase.rpc('create_order', {
      p_name: form.name,
      p_phone: form.phone,
      p_mode: form.mode,
      p_address: form.mode === 'entrega' ? form.address : null,
      p_notes: form.notes,
      p_payment: form.payment,
      p_items: items.map((i) => ({ product_id: i.id, qty: i.qty })),
    })
    setBusy(false)
    if (error) {
      setErr(error.message || 'Não foi possível enviar o pedido. Tente novamente.')
      setStep('form')
      return
    }
    try {
      const prev = JSON.parse(localStorage.getItem('sf_orders') || '[]')
      localStorage.setItem('sf_orders', JSON.stringify([data.id, ...prev].slice(0, 10)))
    } catch {
      /* ignore */
    }
    clear()
    nav(`/acompanhar/${data.id}`, { replace: true })
  }

  /* ---------- Tela de conferência ---------- */
  if (step === 'review') {
    return (
      <main className="mx-auto max-w-xl px-4 py-6">
        <h1 className="text-4xl">Confira seu pedido</h1>

        <ul className="mt-4 divide-y divide-white/10 rounded-2xl bg-brand-900/70 px-4">
          {items.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="font-semibold">
                  {i.qty}× {i.name}
                </p>
                <p className="text-xs text-cream/60">{brl(i.price)} cada</p>
              </div>
              <span className="font-display text-lg text-accent">{brl(i.price * i.qty)}</span>
            </li>
          ))}
          <li className="flex items-center justify-between py-3">
            <span className="text-lg font-bold">Total</span>
            <span className="font-display text-3xl text-accent">{brl(total)}</span>
          </li>
        </ul>

        <div className="mt-4 divide-y divide-white/10 rounded-2xl bg-brand-900/70 px-4 py-2">
          <Row label="Nome">{form.name}</Row>
          <Row label="Telefone">{form.phone}</Row>
          <Row label="Modalidade">{MODE[form.mode]}</Row>
          {form.mode === 'entrega' && <Row label="Endereço">{form.address}</Row>}
          <Row label="Pagamento">{PAYMENT[form.payment]}</Row>
          {form.notes && <Row label="Observações">{form.notes}</Row>}
        </div>

        {form.payment === 'pix' && <p className="mt-3 text-sm text-cream/70">Após confirmar, você verá o código Pix para pagamento.</p>}
        {err && <p className="mt-3 rounded-lg bg-red-950 p-3 text-sm text-red-200">{err}</p>}

        <div className="mt-6 grid gap-3">
          <button onClick={confirm} disabled={busy} className="btn btn-primary text-lg">
            {busy ? 'Enviando…' : 'Confirmar e enviar pedido'}
          </button>
          <button onClick={() => setStep('form')} disabled={busy} className="btn btn-outline">
            Voltar e editar
          </button>
        </div>
      </main>
    )
  }

  /* ---------- Formulário ---------- */
  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <h1 className="text-4xl">Finalizar pedido</h1>

      <ul className="mt-4 space-y-2 rounded-2xl bg-brand-900/70 p-4">
        {items.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-3">
            <span className="min-w-0 flex-1 truncate font-semibold">{i.name}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setQty(i.id, i.qty - 1)} className="h-8 w-8 rounded-md bg-white/10 font-bold" aria-label="Menos">
                −
              </button>
              <span className="w-6 text-center font-bold">{i.qty}</span>
              <button onClick={() => setQty(i.id, i.qty + 1)} className="h-8 w-8 rounded-md bg-accent font-bold text-brand-950" aria-label="Mais">
                +
              </button>
            </div>
            <span className="w-24 text-right font-display text-lg text-accent">{brl(i.price * i.qty)}</span>
          </li>
        ))}
        <li className="flex justify-between border-t border-white/10 pt-3">
          <span className="font-bold">Total</span>
          <span className="font-display text-2xl text-accent">{brl(total)}</span>
        </li>
      </ul>

      <h2 className="mt-6 mb-2 text-2xl">Como você quer receber?</h2>
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(MODE).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setForm((f) => ({ ...f, mode: k }))}
            className={`rounded-xl border-2 px-3 py-3 font-bold ${form.mode === k ? 'border-accent bg-accent/15 text-accent' : 'border-white/20'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <h2 className="mt-6 mb-2 text-2xl">Seus dados</h2>
      <div className="space-y-3">
        <input className="input" placeholder="Nome" value={form.name} onChange={set('name')} autoComplete="name" />
        <input className="input" placeholder="Telefone com DDD" inputMode="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" />
        {form.mode === 'entrega' && (
          <textarea className="input" rows={2} placeholder="Endereço de entrega (rua, número, bairro, referência)" value={form.address} onChange={set('address')} />
        )}
        <textarea className="input" rows={2} placeholder="Observações do pedido (ex.: sem cebola)" value={form.notes} onChange={set('notes')} />
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={saveInfo} type="button" className="btn btn-outline btn-sm">
            Salvar informações
          </button>
          {hasSaved && (
            <button onClick={clearInfo} type="button" className="text-sm text-cream/60 underline">
              Apagar dados salvos
            </button>
          )}
          {savedMsg && <span className="text-sm text-accent">Salvo neste dispositivo ✓</span>}
        </div>
      </div>

      <h2 className="mt-6 mb-2 text-2xl">Forma de pagamento</h2>
      <div className="grid gap-2">
        {Object.entries(PAYMENT)
          .filter(([k]) => k !== 'pix' || settings.pix_enabled !== false)
          .map(([k, label]) => (
            <label
              key={k}
              className={`flex cursor-pointer items-center justify-between rounded-xl border-2 px-4 py-3 ${form.payment === k ? 'border-accent bg-accent/15' : 'border-white/20'}`}
            >
              <span className="font-bold">{label}</span>
              <span className="text-xs text-cream/60">{k === 'pix' ? 'Pague agora pelo app' : k === 'dinheiro' ? 'Pagar na entrega/retirada' : 'Maquininha na entrega/retirada'}</span>
              <input type="radio" name="pay" className="hidden" checked={form.payment === k} onChange={() => setForm((f) => ({ ...f, payment: k }))} />
            </label>
          ))}
      </div>

      {err && <p className="mt-4 rounded-lg bg-red-950 p-3 text-sm text-red-200">{err}</p>}

      <button onClick={review} className="btn btn-primary mt-6 w-full text-lg">
        Revisar pedido
      </button>
      <Link to="/pedido" className="mt-3 block text-center text-sm text-cream/70 underline">
        Adicionar mais itens
      </Link>
    </main>
  )
}
