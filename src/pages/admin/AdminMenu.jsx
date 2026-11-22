import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { CATEGORIES, brl } from '../../lib/format.js'
import { Field, ImageInput, Modal, Spinner } from '../../components/admin.jsx'
import ProductImage from '../../components/ProductImage.jsx'

const EMPTY = { name: '', description: '', price: '', category: 'lanches', image_url: null, available: true, featured: false }

export default function AdminMenu() {
  const [products, setProducts] = useState(null)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase.from('products').select('*').order('sort').order('name')
    setProducts(data || [])
  }, [])
  useEffect(() => {
    load()
  }, [load])

  async function toggleAvailable(p) {
    const { error } = await supabase.from('products').update({ available: !p.available }).eq('id', p.id)
    if (error) return alert(error.message)
    setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, available: !p.available } : x)))
  }

  async function remove(p) {
    if (!confirm(`Excluir "${p.name}"? Pedidos antigos continuam no histórico.`)) return
    const { error } = await supabase.from('products').delete().eq('id', p.id)
    if (error) return alert(error.message)
    setProducts((prev) => prev.filter((x) => x.id !== p.id))
  }

  async function save(e) {
    e.preventDefault()
    const price = Number(String(editing.price).replace(',', '.'))
    if (!editing.name.trim()) return setErr('Informe o nome.')
    if (Number.isNaN(price) || price < 0) return setErr('Informe um preço válido.')
    setSaving(true)
    setErr('')
    const payload = {
      name: editing.name.trim(),
      description: editing.description.trim(),
      price,
      category: editing.category,
      image_url: editing.image_url,
      available: editing.available,
      featured: editing.category === 'lanches' ? editing.featured : false,
    }
    const { error } = editing.id
      ? await supabase.from('products').update(payload).eq('id', editing.id)
      : await supabase.from('products').insert(payload)
    setSaving(false)
    if (error) return setErr(error.message)
    setEditing(null)
    load()
  }

  if (!products) return <Spinner />

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-3xl">Cardápio</h1>
        <button className="btn btn-primary" onClick={() => { setErr(''); setEditing({ ...EMPTY }) }}>
          + Novo produto
        </button>
      </div>

      {CATEGORIES.map((c) => {
        const list = products.filter((p) => p.category === c.id)
        return (
          <section key={c.id} className="mb-8">
            <h2 className="mb-2 text-2xl text-brand-800">
              {c.label} <span className="text-base text-neutral-400">({list.length})</span>
            </h2>
            {list.length === 0 ? (
              <p className="card-admin p-4 text-sm text-neutral-500">Nenhum item em {c.label.toLowerCase()}.</p>
            ) : (
              <ul className="space-y-2">
                {list.map((p) => (
                  <li key={p.id} className="card-admin flex items-center gap-3 p-3">
                    <ProductImage src={p.image_url} name={p.name} className="h-16 w-16" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">
                        {p.name} {p.featured && <span className="ml-1 rounded bg-accent/20 px-1.5 text-xs text-accent-600">destaque</span>}
                      </p>
                      <p className="truncate text-xs text-neutral-500">{p.description || 'Sem descrição'}</p>
                      <p className="text-sm font-bold text-brand-800">{brl(p.price)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 sm:flex-row sm:items-center">
                      <button
                        onClick={() => toggleAvailable(p)}
                        className={`rounded-full px-3 py-1 text-xs font-bold ${p.available ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}
                      >
                        {p.available ? 'Disponível' : 'Indisponível'}
                      </button>
                      <button onClick={() => { setErr(''); setEditing({ ...p, price: String(p.price) }) }} className="btn btn-light btn-sm">
                        Editar
                      </button>
                      <button onClick={() => remove(p)} className="btn btn-sm text-red-600 hover:bg-red-50">
                        Excluir
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}

      {editing && (
        <Modal title={editing.id ? 'Editar produto' : 'Novo produto'} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-4">
            <Field label="Categoria">
              <select className="input" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nome">
              <input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required />
            </Field>
            <Field label={editing.category === 'lanches' ? 'Componentes do lanche' : 'Descrição'} hint={editing.category === 'lanches' ? 'Ex.: pão, hambúrguer 150g, queijo, alface, tomate e molho da casa' : undefined}>
              <textarea className="input" rows={3} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </Field>
            <Field label="Preço (R$)">
              <input className="input" inputMode="decimal" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} required />
            </Field>
            <ImageInput folder="produtos" value={editing.image_url} onChange={(url) => setEditing({ ...editing, image_url: url })} />
            <label className="flex items-center gap-2 font-semibold">
              <input type="checkbox" checked={editing.available} onChange={(e) => setEditing({ ...editing, available: e.target.checked })} className="h-5 w-5 accent-[#fe7c00]" />
              Disponível para pedido
            </label>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <div className="flex gap-2">
              <button className="btn btn-primary flex-1" disabled={saving}>
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
              <button type="button" className="btn btn-light" onClick={() => setEditing(null)}>
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
