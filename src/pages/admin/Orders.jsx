import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'
import { useSettings } from '../../context/SettingsContext.jsx'
import { MODE, PAYMENT, STATUS, STATUS_COLOR, brl, fmtDateTime, waLink } from '../../lib/format.js'

const FILTERS = [
  ['ativos', 'Ativos'],
  ['finalizado', 'Finalizados'],
  ['cancelado', 'Cancelados'],
  ['todos', 'Todos'],
]

export default function Orders() {
  const { orders, setOrders } = useOutletContext()
  const { settings } = useSettings()
  const [filter, setFilter] = useState('ativos')
  const [openId, setOpenId] = useState(null)

  const list = orders.filter((o) =>
    filter === 'todos' ? true : filter === 'ativos' ? !['finalizado', 'cancelado'].includes(o.status) : o.status === filter
  )

  async function patch(o, changes) {
    const { error } = await supabase.from('orders').update({ ...changes, updated_at: new Date().toISOString() }).eq('id', o.id)
    if (error) return alert('Não foi possível atualizar: ' + error.message)
    setOrders((prev) => prev.map((x) => (x.id === o.id ? { ...x, ...changes } : x)))
  }

  function setStatus(o, status) {
    if (status === o.status) return
    if (status === 'cancelado') {
      const pixPago = o.payment_method === 'pix' && o.payment_status === 'aprovado'
      const msg = pixPago
        ? 'Este pedido já foi pago via Pix. Cancelar NÃO faz reembolso automático — o estorno deve ser tratado à parte. Cancelar mesmo assim?'
        : 'Cancelar este pedido?'
      if (!confirm(msg)) return
    }
    patch(o, { status })
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)} className={`btn btn-sm ${filter === k ? 'btn-dark' : 'btn-light'}`}>
            {label}
            {k === 'ativos' && ` (${orders.filter((o) => !['finalizado', 'cancelado'].includes(o.status)).length})`}
          </button>
        ))}
      </div>

      {list.length === 0 && <p className="card-admin p-8 text-center text-neutral-500">Nenhum pedido nesta lista.</p>}

      <ul className="space-y-3">
        {list.map((o) => {
          const open = openId === o.id
          const isNew = o.status === 'aguardando_confirmacao'
          return (
            <li key={o.id} className={`card-admin overflow-hidden ${isNew ? 'ring-2 ring-accent' : ''}`}>
              <button onClick={() => setOpenId(open ? null : o.id)} className="flex w-full items-center gap-3 p-4 text-left">
                <span className="font-display text-2xl text-brand-800">#{o.number}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{o.customer_name}</p>
                  <p className="text-xs text-neutral-500">
                    {fmtDateTime(o.created_at)} · {MODE[o.mode]} · {PAYMENT[o.payment_method]}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{brl(o.total)}</p>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_COLOR[o.status]}`}>{STATUS[o.status]}</span>
                </div>
              </button>

              {open && (
                <div className="space-y-4 border-t border-neutral-200 bg-neutral-50 p-4 text-sm">
                  <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                    <p>
                      <b>Cliente:</b> {o.customer_name}
                    </p>
                    <p>
                      <b>Telefone:</b> {o.customer_phone}
                    </p>
                    <p>
                      <b>Modalidade:</b> {MODE[o.mode]}
                    </p>
                    {o.mode === 'entrega' && (
                      <p>
                        <b>Endereço:</b> {o.address}
                      </p>
                    )}
                    <p>
                      <b>Pagamento:</b> {PAYMENT[o.payment_method]} —{' '}
                      <span className={o.payment_status === 'aprovado' ? 'font-bold text-emerald-700' : 'font-bold text-amber-700'}>
                        {o.payment_status === 'aprovado' ? 'Aprovado' : 'Pendente'}
                      </span>
                    </p>
                    <p>
                      <b>Horário:</b> {fmtDateTime(o.created_at)}
                    </p>
                  </div>

                  <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
                    {o.items.map((i, idx) => (
                      <li key={idx} className="flex justify-between px-3 py-2">
                        <span>
                          {i.qty}× {i.name}
                        </span>
                        <span>{brl(i.price * i.qty)}</span>
                      </li>
                    ))}
                    <li className="flex justify-between px-3 py-2 font-bold">
                      <span>Total</span>
                      <span>{brl(o.total)}</span>
                    </li>
                  </ul>

                  {o.notes && (
                    <p className="rounded-lg bg-amber-50 p-3">
                      <b>Observações:</b> {o.notes}
                    </p>
                  )}

                  <div>
                    <p className="mb-2 font-bold">Atualizar status</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(STATUS).map(([k, label]) => (
                        <button key={k} onClick={() => setStatus(o, k)} className={`btn btn-sm ${o.status === k ? 'btn-dark' : 'btn-light'}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {o.payment_method !== 'pix' && (
                      <button onClick={() => patch(o, { payment_status: o.payment_status === 'aprovado' ? 'pendente' : 'aprovado' })} className="btn btn-light btn-sm">
                        {o.payment_status === 'aprovado' ? 'Marcar pagamento como pendente' : 'Marcar pagamento como recebido'}
                      </button>
                    )}
                    <a
                      href={waLink(o.customer_phone, `Olá, ${o.customer_name}! Aqui é da ${settings.name}. Sobre o seu pedido #${o.number}: `)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-sm bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      Chamar cliente no WhatsApp
                    </a>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
