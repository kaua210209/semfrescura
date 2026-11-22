import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { fmtDateTime } from '../../lib/format.js'
import { Field, Modal, Spinner } from '../../components/admin.jsx'
import { StarIcon } from '../../components/icons.jsx'

const EMPTY = { author: '', rating: 5, comment: '', visible: true }

export default function ReviewsAdmin() {
  const [list, setList] = useState(null)
  const [editing, setEditing] = useState(null)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase.from('reviews').select('*').order('created_at', { ascending: false })
    setList(data || [])
  }, [])
  useEffect(() => {
    load()
  }, [load])

  async function save(e) {
    e.preventDefault()
    if (!editing.author.trim()) return setErr('Informe o nome de quem avaliou.')
    const payload = { author: editing.author.trim(), rating: Number(editing.rating), comment: editing.comment.trim(), visible: editing.visible }
    const { error } = editing.id ? await supabase.from('reviews').update(payload).eq('id', editing.id) : await supabase.from('reviews').insert(payload)
    if (error) return setErr(error.message)
    setEditing(null)
    load()
  }

  async function toggle(r) {
    await supabase.from('reviews').update({ visible: !r.visible }).eq('id', r.id)
    load()
  }
  async function remove(r) {
    if (!confirm('Excluir esta avaliação?')) return
    await supabase.from('reviews').delete().eq('id', r.id)
    load()
  }

  if (!list) return <Spinner />

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-3xl">Avaliações</h1>
        <button className="btn btn-primary" onClick={() => { setErr(''); setEditing({ ...EMPTY }) }}>
          + Nova avaliação
        </button>
      </div>

      {list.length === 0 && <p className="card-admin p-8 text-center text-neutral-500">Nenhuma avaliação cadastrada.</p>}

      <ul className="space-y-2">
        {list.map((r) => (
          <li key={r.id} className="card-admin flex flex-wrap items-start gap-3 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <b>{r.author}</b>
                <span className="flex text-accent">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <StarIcon key={n} filled={n <= r.rating} className="h-4 w-4" />
                  ))}
                </span>
                <span className="text-xs text-neutral-400">{fmtDateTime(r.created_at)}</span>
              </div>
              {r.comment && <p className="mt-1 text-sm text-neutral-700">{r.comment}</p>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggle(r)} className={`rounded-full px-3 py-1 text-xs font-bold ${r.visible ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-600'}`}>
                {r.visible ? 'Visível' : 'Oculta'}
              </button>
              <button onClick={() => { setErr(''); setEditing({ ...r }) }} className="btn btn-light btn-sm">
                Editar
              </button>
              <button onClick={() => remove(r)} className="btn btn-sm text-red-600 hover:bg-red-50">
                Excluir
              </button>
            </div>
          </li>
        ))}
      </ul>

      {editing && (
        <Modal title={editing.id ? 'Editar avaliação' : 'Nova avaliação'} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-4">
            <Field label="Nome do cliente">
              <input className="input" value={editing.author} onChange={(e) => setEditing({ ...editing, author: e.target.value })} required />
            </Field>
            <Field label="Nota">
              <select className="input" value={editing.rating} onChange={(e) => setEditing({ ...editing, rating: e.target.value })}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'estrela' : 'estrelas'}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Comentário">
              <textarea className="input" rows={3} value={editing.comment} onChange={(e) => setEditing({ ...editing, comment: e.target.value })} />
            </Field>
            <label className="flex items-center gap-2 font-semibold">
              <input type="checkbox" checked={editing.visible} onChange={(e) => setEditing({ ...editing, visible: e.target.checked })} className="h-5 w-5 accent-[#fe7c00]" />
              Exibir na página inicial
            </label>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <div className="flex gap-2">
              <button className="btn btn-primary flex-1">Salvar</button>
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
