import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { brl } from '../../lib/format.js'
import { Spinner } from '../../components/admin.jsx'
import ProductImage from '../../components/ProductImage.jsx'

const MAX = 3

export default function Featured() {
  const [list, setList] = useState(null)

  useEffect(() => {
    supabase
      .from('products')
      .select('*')
      .eq('category', 'lanches')
      .order('sort')
      .order('name')
      .then(({ data }) => setList(data || []))
  }, [])

  if (!list) return <Spinner />
  const count = list.filter((p) => p.featured).length

  async function toggle(p) {
    if (!p.featured && count >= MAX) return alert(`Você já escolheu ${MAX} destaques. Desmarque um para escolher outro.`)
    const { error } = await supabase.from('products').update({ featured: !p.featured }).eq('id', p.id)
    if (error) return alert(error.message)
    setList((prev) => prev.map((x) => (x.id === p.id ? { ...x, featured: !p.featured } : x)))
  }

  return (
    <div>
      <h1 className="text-3xl">Lanches em destaque</h1>
      <p className="mt-1 mb-4 text-sm text-neutral-600">
        Escolha até {MAX} lanches para aparecer na página inicial. Selecionados: <b>{count}/{MAX}</b>
      </p>
      {list.length === 0 && <p className="card-admin p-6 text-center text-neutral-500">Cadastre lanches no Cardápio primeiro.</p>}
      <ul className="space-y-2">
        {list.map((p) => (
          <li key={p.id} className={`card-admin flex items-center gap-3 p-3 ${p.featured ? 'ring-2 ring-accent' : ''}`}>
            <ProductImage src={p.image_url} name={p.name} className="h-14 w-14" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{p.name}</p>
              <p className="text-sm text-neutral-500">{brl(p.price)}</p>
            </div>
            <button onClick={() => toggle(p)} className={`btn btn-sm ${p.featured ? 'btn-primary' : 'btn-light'}`}>
              {p.featured ? '★ Em destaque' : 'Destacar'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
