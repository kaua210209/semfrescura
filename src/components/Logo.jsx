import { useSettings } from '../context/SettingsContext.jsx'

export default function Logo({ className = 'h-10' }) {
  const { settings } = useSettings()
  if (settings.logo_url) {
    return <img src={settings.logo_url} alt={settings.name} className={`${className} w-auto object-contain`} />
  }
  return <span className="font-display text-2xl leading-none text-cream sm:text-3xl">{settings.name}</span>
}
