import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useSettings } from '../../context/SettingsContext.jsx'
import { Field, ImageInput } from '../../components/admin.jsx'

export default function SettingsAdmin() {
  const { settings, reload } = useSettings()
  const [form, setForm] = useState(settings)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    setForm(settings)
  }, [settings])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    const { error } = await supabase
      .from('settings')
      .update({
        name: form.name?.trim() || 'Sem Frescura',
        logo_url: form.logo_url || null,
        phone: form.phone?.trim() || '',
        address: form.address?.trim() || '',
        map_url: form.map_url?.trim() || '',
        opening_hours: form.opening_hours?.trim() || '',
        pix_enabled: !!form.pix_enabled,
      })
      .eq('id', 1)
    setSaving(false)
    if (error) return setMsg('Erro: ' + error.message)
    await reload()
    setMsg('Configurações salvas ✓')
  }

  return (
    <div className="max-w-xl">
      <h1 className="mb-4 text-3xl">Configurações da lanchonete</h1>
      <form onSubmit={save} className="card-admin space-y-4 p-5">
        <Field label="Nome da lanchonete">
          <input className="input" value={form.name || ''} onChange={set('name')} required />
        </Field>
        <ImageInput label="Logo" folder="logo" value={form.logo_url} onChange={(url) => setForm((f) => ({ ...f, logo_url: url }))} />
        <Field label="WhatsApp da lanchonete" hint="Com DDD. Usado nos botões de acompanhar e cancelar pedido. Ex.: (32) 99999-9999">
          <input className="input" inputMode="tel" value={form.phone || ''} onChange={set('phone')} placeholder="(32) 99999-9999" />
        </Field>
        <Field label="Endereço">
          <textarea className="input" rows={2} value={form.address || ''} onChange={set('address')} />
        </Field>
        <Field label="Link do mapa (opcional)" hint="Cole o link do Google Maps. Se vazio, o botão abre uma busca pelo endereço.">
          <input className="input" type="url" value={form.map_url || ''} onChange={set('map_url')} placeholder="https://maps.app.goo.gl/..." />
        </Field>
        <Field label="Horário de funcionamento (opcional)">
          <textarea className="input" rows={3} value={form.opening_hours || ''} onChange={set('opening_hours')} placeholder={'Ter a Dom: 18h às 23h\nSegunda: fechado'} />
        </Field>
        <label className="flex items-center gap-2 font-semibold">
          <input type="checkbox" checked={!!form.pix_enabled} onChange={(e) => setForm((f) => ({ ...f, pix_enabled: e.target.checked }))} className="h-5 w-5 accent-[#fe7c00]" />
          Aceitar pagamento via Pix no app
        </label>
        <div className="flex items-center gap-3">
          <button className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
          {msg && <span className="text-sm">{msg}</span>}
        </div>
      </form>
    </div>
  )
}
