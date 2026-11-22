import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { uploadImage } from '../../lib/upload.js'
import { Spinner } from '../../components/admin.jsx'

export default function CarouselAdmin() {
  const [slides, setSlides] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase.from('carousel_images').select('*').order('sort').order('created_at')
    setSlides(data || [])
  }, [])
  useEffect(() => {
    load()
  }, [load])

  async function add(e) {
    const files = [...(e.target.files || [])]
    e.target.value = ''
    if (!files.length) return
    setBusy(true)
    setErr('')
    try {
      const start = slides?.length || 0
      for (const [i, f] of files.entries()) {
        const url = await uploadImage(f, 'carrossel')
        const { error } = await supabase.from('carousel_images').insert({ image_url: url, sort: start + i })
        if (error) throw error
      }
      await load()
    } catch (x) {
      setErr(x.message || 'Falha ao enviar')
    } finally {
      setBusy(false)
    }
  }

  async function replace(s, e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setBusy(true)
    setErr('')
    try {
      const url = await uploadImage(f, 'carrossel')
      const { error } = await supabase.from('carousel_images').update({ image_url: url }).eq('id', s.id)
      if (error) throw error
      await load()
    } catch (x) {
      setErr(x.message || 'Falha ao trocar')
    } finally {
      setBusy(false)
    }
  }

  async function remove(s) {
    if (!confirm('Excluir esta imagem do carrossel?')) return
    const { error } = await supabase.from('carousel_images').delete().eq('id', s.id)
    if (error) return alert(error.message)
    load()
  }

  async function move(idx, dir) {
    const a = slides[idx]
    const b = slides[idx + dir]
    if (!b) return
    // reatribui a ordem de todos para evitar empates
    const next = [...slides]
    next[idx] = b
    next[idx + dir] = a
    setSlides(next)
    await Promise.all(next.map((s, i) => supabase.from('carousel_images').update({ sort: i }).eq('id', s.id)))
  }

  if (!slides) return <Spinner />

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-3xl">Carrossel da página inicial</h1>
        <label className="btn btn-primary">
          {busy ? 'Enviando…' : '+ Adicionar imagens'}
          <input type="file" accept="image/*" multiple hidden onChange={add} disabled={busy} />
        </label>
      </div>
      <p className="mb-4 text-sm text-neutral-600">Use imagens horizontais (16:9) para o melhor resultado. A ordem abaixo é a ordem de exibição.</p>
      {err && <p className="mb-3 text-sm text-red-600">{err}</p>}

      {slides.length === 0 && <p className="card-admin p-8 text-center text-neutral-500">Nenhuma imagem ainda. Sem imagens, a home mostra um banner padrão com o nome da lanchonete.</p>}

      <ul className="grid gap-4 sm:grid-cols-2">
        {slides.map((s, idx) => (
          <li key={s.id} className="card-admin overflow-hidden">
            <img src={s.image_url} alt="" className="aspect-[16/9] w-full object-cover" />
            <div className="flex flex-wrap items-center gap-2 p-3">
              <button onClick={() => move(idx, -1)} disabled={idx === 0} className="btn btn-light btn-sm" aria-label="Mover para antes">
                ←
              </button>
              <button onClick={() => move(idx, 1)} disabled={idx === slides.length - 1} className="btn btn-light btn-sm" aria-label="Mover para depois">
                →
              </button>
              <label className="btn btn-light btn-sm">
                Trocar
                <input type="file" accept="image/*" hidden onChange={(e) => replace(s, e)} disabled={busy} />
              </label>
              <button onClick={() => remove(s)} className="btn btn-sm ml-auto text-red-600 hover:bg-red-50">
                Excluir
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
