export default function ProductImage({ src, name, className = 'h-24 w-24' }) {
  if (src) return <img src={src} alt={name} loading="lazy" className={`${className} shrink-0 rounded-xl object-cover`} />
  return (
    <div className={`${className} grid shrink-0 place-items-center rounded-xl bg-brand-900 font-display text-3xl text-accent`}>
      {(name || '?').charAt(0)}
    </div>
  )
}
