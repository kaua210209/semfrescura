const base = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }

export const HomeIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M3 11l9-8 9 8" />
    <path d="M5 10v10h14V10" />
  </svg>
)
export const BagIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M6 7h12l1 13H5L6 7z" />
    <path d="M9 7a3 3 0 016 0" />
  </svg>
)
export const PinIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
)
export const StarIcon = ({ filled = true, ...p }) => (
  <svg {...base} {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z" />
  </svg>
)
export const WhatsIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M3 21l1.6-4.8A8.5 8.5 0 1112 20.5a8.4 8.4 0 01-4-1L3 21z" />
    <path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-.8.8a4 4 0 01-1.9-1.9l.8-.8-1-2L9 9.5z" />
  </svg>
)
