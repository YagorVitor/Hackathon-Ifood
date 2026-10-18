// Ícones vetoriais no traço 2px (estilo Lucide), desenhados inline para não adicionar dependência.
const PATHS = {
  settings: ['M4 7h16', 'M4 17h16', 'M8 4v6', 'M16 14v6'],
  mic: ['M9 4a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0Z', 'M5 10v1a7 7 0 0 0 14 0v-1', 'M12 18v4', 'M8 22h8'],
  volume: ['m11 5-6 4H2v6h3l6 4Z', 'M15 8a6 6 0 0 1 0 8', 'M18 5a10 10 0 0 1 0 14'],
  stop: ['M5 5h14v14H5Z'],
  camera: ['M14.5 4h-5L7 7H3v13h18V7h-4Z', 'M12 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z'],
  image: ['M3 3h18v18H3Z', 'm3 16 5-5 4 4 4-6 5 7', 'M8 7h.01'],
  jar: ['M7 3h10v3H7z', 'M6 6h12v2a2 2 0 0 1 1 1.7V19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9.7A2 2 0 0 1 6 8Z', 'M8.5 13.5h7'],
  check: ['M20 6 9 17l-5-5'],
  x: ['M18 6 6 18', 'M6 6l12 12'],
  plus: ['M12 5v14', 'M5 12h14'],
  pin: ['M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z', 'M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'],
  alert: ['m21.7 18-8-14a2 2 0 0 0-3.5 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z', 'M12 9v4', 'M12 17h.01'],
  info: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z', 'M12 16v-4', 'M12 8h.01'],
  back: ['m12 19-7-7 7-7', 'M19 12H5'],
  store: ['M3 9 4.5 4h15L21 9', 'M4 9v11h16V9', 'M3 9h18', 'M9.5 20v-5h5v5'],
  leaf: ['M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z', 'M2 21c0-3 1.9-5.4 5.1-6C9.5 14.5 12 13 13 12'],
  shield: ['M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1Z'],
  sparkle: ['M12 3l1.9 5.6 5.6 1.9-5.6 1.9L12 18l-1.9-5.6-5.6-1.9 5.6-1.9Z', 'M19 17v4', 'M17 19h4'],
  user: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M4 21a8 8 0 0 1 16 0'],
  approx: ['M4 9c2-2 4-2 6 0s4 2 6 0 3-2 4-1', 'M4 15c2-2 4-2 6 0s4 2 6 0 3-2 4-1'],
  loader: ['M21 12a9 9 0 1 1-6.2-8.6'],
  pencil: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z'],
  trash: ['M3 6h18', 'M8 6V4h8v2', 'M19 6l-1 14H6L5 6'],
  refresh: ['M3 12a9 9 0 0 1 15-6.7L21 8', 'M21 3v5h-5', 'M21 12a9 9 0 0 1-15 6.7L3 16', 'M8 16H3v5'],
  external: ['M15 3h6v6', 'M10 14 21 3', 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'],
  search: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z', 'm21 21-4.3-4.3'],
  bowl: ['M3 11h18a9 9 0 0 1-18 0Z', 'M8 7c0-1.5 1-2 1-3.5', 'M12 7c0-1.5 1-2 1-3.5', 'M16 7c0-1.5 1-2 1-3.5'],
  cart: ['M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L21.6 7H6', 'M9 21h.01', 'M18 21h.01'],
  minus: ['M5 12h14'],
  plug: ['M12 22v-5', 'M9 8V2', 'M15 8V2', 'M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z'],
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, className = 'size-5' }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      {PATHS[name].map((d) => <path key={d} d={d} />)}
    </svg>
  )
}
