import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { MODE, PAYMENT, STATUS, STATUS_COLOR, brl, dayKey, fmtDateTime } from '../../lib/format.js'
import { Spinner } from '../../components/admin.jsx'

const PERIODS = [
  ['hoje', 'Hoje'],
  ['7', '7 dias'],
  ['30', '30 dias'],
  ['tudo', 'Tudo'],
  ['custom', 'Personalizado'],
]

function range(period, from, to) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  if (period === 'hoje') return [start, null]
  if (period === '7') return [new Date(start.getTime() - 6 * 864e5), null]
  if (period === '30') return [new Date(start.getTime() - 29 * 864e5), null]
  if (period === 'custom') {
    const a = from ? new Date(from + 'T00:00:00') : null
    const b = to ? new Date(to + 'T23:59:59') : null
    return [a, b]
  }
  return [null, null]
}

export default function Reports() {
  const [period, setPeriod] = useState('7')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [orders, setOrders] = useState(null)
  const [statusFilter, setStatusFilter] = useState('todos')

  useEffect(() => {
    let alive = true
    ;(async () => {
      setOrders(null)
      const [a, b] = range(period, from, to)
      let q = supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(3000)
      if (a) q = q.gte('created_at', a.toISOString())
      if (b) q = q.lte('created_at', b.toISOString())
      const { data } = await q
      if (alive) setOrders(data || [])
    })()
    return () => {
      alive = false
    }
  }, [period, from, to])

  const stats = useMemo(() => {
    if (!orders) return null
    const done = orders.filter((o) => o.status === 'finalizado')
    const cancelled = orders.filter((o) => o.status === 'cancelado')
    const revenue = done.reduce((s, o) => s + Number(o.total), 0)
    const byDay = {}
    done.forEach((o) => {
      const k = dayKey(o.created_at)
      byDay[k] = (byDay[k] || 0) + Number(o.total)
    })
    const days = Object.entries(byDay).sort(([a], [b]) => (a < b ? -1 : 1)).slice(-31)
    const prod = {}
    done.forEach((o) =>
      o.items.forEach((i) => {
        prod[i.name] = prod[i.name] || { qty: 0, total: 0 }
        prod[i.name].qty += i.qty
        prod[i.name].total += i.qty * i.price
      })
    )
    const top = Object.entries(prod).sort(([, a], [, b]) => b.qty - a.qty).slice(0, 8)
    return {
      done: done.length,
      cancelled: cancelled.length,
      cancelledValue: cancelled.reduce((s, o) => s + Number(o.total), 0),
      revenue,
      avg: done.length ? revenue / done.length : 0,
      days,
      maxDay: Math.max(1, ...days.map(([, v]) => v)),
      top,
    }
  }, [orders])

  const history = (orders || []).filter((o) => statusFilter === 'todos' || o.status === statusFilter)

  return (
    <div>
      <h1 className="mb-4 text-3xl">Histórico e relatórios</h1>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {PERIODS.map(([k, label]) => (
          <button key={k} onClick={() => setPeriod(k)} className={`btn btn-sm ${period === k ? 'btn-dark' : 'btn-light'}`}>
            {label}
          </button>
        ))}
        {period === 'custom' && (
          <>
            <input type="date" className="input !w-auto" value={from} onChange={(e) => setFrom(e.target.value)} />
            <span>até</span>
            <input type="date" className="input !w-auto" value={to} onChange={(e) => setTo(e.target.value)} />
          </>
        )}
      </div>

      {!stats ? (
        <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ['Vendas (finalizados)', brl(stats.revenue)],
              ['Pedidos finalizados', stats.done],
              ['Ticket médio', brl(stats.avg)],
              ['Cancelados', `${stats.cancelled} · ${brl(stats.cancelledValue)}`],
            ].map(([label, value]) => (
              <div key={label} className="card-admin p-4">
                <p className="text-xs text-neutral-500">{label}</p>
                <p className="mt-1 font-display text-2xl text-brand-800">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <section className="card-admin p-4">
              <h2 className="mb-3 text-xl">Vendas por dia</h2>
              {stats.days.length === 0 ? (
                <p className="text-sm text-neutral-500">Sem vendas finalizadas no período.</p>
              ) : (
                <ul className="space-y-1.5">
                  {stats.days.map(([d, v]) => (
                    <li key={d} className="flex items-center gap-2 text-xs">
                      <span className="w-20 shrink-0 text-neutral-500">{d.split('-').reverse().slice(0, 2).join('/')}</span>
                      <div className="h-5 flex-1 rounded bg-neutral-100">
                        <div className="h-5 rounded bg-accent" style={{ width: `${(v / stats.maxDay) * 100}%` }} />
                      </div>
                      <span className="w-24 shrink-0 text-right font-bold">{brl(v)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card-admin p-4">
              <h2 className="mb-3 text-xl">Mais vendidos</h2>
              {stats.top.length === 0 ? (
                <p className="text-sm text-neutral-500">Sem dados no período.</p>
              ) : (
                <ol className="space-y-1.5 text-sm">
                  {stats.top.map(([name, v], i) => (
                    <li key={name} className="flex justify-between gap-2">
                      <span className="truncate">
                        {i + 1}. {name}
                      </span>
                      <span className="shrink-0 text-neutral-600">
                        {v.qty}× · {brl(v.total)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>

          <section className="mt-6">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-2xl">Pedidos do período ({history.length})</h2>
              <select className="input !w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="todos">Todos os status</option>
                {Object.entries(STATUS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="card-admin overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-neutral-200 text-xs text-neutral-500 uppercase">
                  <tr>
                    <th className="p-3">Pedido</th>
                    <th className="p-3">Data</th>
                    <th className="p-3">Cliente</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3">Pagamento</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((o) => (
                    <tr key={o.id} className="border-b border-neutral-100 last:border-0">
                      <td className="p-3 font-bold">#{o.number}</td>
                      <td className="p-3">{fmtDateTime(o.created_at)}</td>
                      <td className="p-3">{o.customer_name}</td>
                      <td className="p-3">{MODE[o.mode]}</td>
                      <td className="p-3">
                        {PAYMENT[o.payment_method]} · {o.payment_status === 'aprovado' ? 'pago' : 'pendente'}
                      </td>
                      <td className="p-3">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_COLOR[o.status]}`}>{STATUS[o.status]}</span>
                      </td>
                      <td className="p-3 text-right font-bold">{brl(o.total)}</td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-neutral-500">
                        Nenhum pedido encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
