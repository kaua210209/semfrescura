import { useState } from 'react'
import { uploadImage } from '../lib/upload.js'

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-neutral-500">{hint}</span>}
    </label>
  )
}

export function ImageInput({ value, onChange, folder, label = 'Imagem' }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function pick(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setBusy(true)
    setErr('')
    try {
      onChange(await uploadImage(f, folder))
    } catch (x) {
      setErr(x.message || 'Falha ao enviar a imagem')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      <div className="flex items-center gap-3">
        {value ? (
          <img src={value} alt="" className="h-20 w-20 rounded-lg border border-neutral-200 object-cover" />
        ) : (
          <div className="grid h-20 w-20 place-items-center rounded-lg border border-dashed border-neutral-300 text-xs text-neutral-400">Sem imagem</div>
        )}
        <label className="btn btn-dark btn-sm">
          {busy ? 'Enviando…' : value ? 'Trocar imagem' : 'Escolher imagem'}
          <input type="file" accept="image/*" hidden onChange={pick} disabled={busy} />
        </label>
        {value && !busy && (
          <button type="button" onClick={() => onChange(null)} className="text-sm text-red-600 underline">
            Remover
          </button>
        )}
      </div>
      {err && <p className="mt-1 text-sm text-red-600">{err}</p>}
    </div>
  )
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div className="max-h-[92vh] w-full overflow-auto rounded-t-2xl bg-white p-5 text-neutral-900 sm:max-w-lg sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl">{title}</h2>
          <button onClick={onClose} aria-label="Fechar" className="text-2xl leading-none text-neutral-500">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Spinner({ text = 'Carregando…' }) {
  return <p className="p-8 text-center text-neutral-500">{text}</p>
}
