import { Link } from 'react-router-dom'
import { useSettings } from '../context/SettingsContext.jsx'
import Logo from './Logo.jsx'
import { waLink } from '../lib/format.js'

export default function Footer() {
  const { settings } = useSettings()
  return (
    <footer className="mt-12 bg-brand-950 px-4 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Logo className="h-12" />
          {settings.address && <p className="max-w-xs text-sm text-cream/70">{settings.address}</p>}
          {settings.opening_hours && <p className="max-w-xs whitespace-pre-line text-sm text-cream/70">{settings.opening_hours}</p>}
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <Link to="/pedido" className="font-display text-xl text-accent">
            Fazer pedido
          </Link>
          {settings.phone && (
            <a href={waLink(settings.phone, 'Olá! Gostaria de falar com a lanchonete.')} target="_blank" rel="noreferrer" className="text-cream/80 hover:text-cream">
              WhatsApp: {settings.phone}
            </a>
          )}
        </div>
      </div>
      <div className="mx-auto mt-8 flex max-w-5xl items-center justify-between border-t border-white/10 pt-4 text-xs text-cream/50">
        <span>
          © {new Date().getFullYear()} {settings.name}. Todos os direitos reservados.
        </span>
        <Link to="/admin" className="hover:text-cream/80">
          Área administrativa
        </Link>
      </div>
    </footer>
  )
}
