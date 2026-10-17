import type { ReactNode } from 'react'
import type { Provenance } from '../types'

const BADGES: Record<Provenance, { label: string; cls: string }> = {
  DECLARED: { label: 'Declarado por você', cls: 'bg-blue-100 text-blue-800' },
  INFERRED: { label: 'Inferido pela IA', cls: 'bg-purple-100 text-purple-800' },
  MCP: { label: 'Dado iFood (MCP)', cls: 'bg-green-100 text-green-800' },
  ESTIMATED: { label: 'Estimativa', cls: 'bg-amber-100 text-amber-800' },
  EXECUTED: { label: 'Ação executada', cls: 'bg-emerald-100 text-emerald-800' },
  FIXTURE: { label: 'Simulado', cls: 'bg-gray-200 text-gray-700' },
}

export function Badge({ p }: { p: Provenance }) {
  const b = BADGES[p]
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${b.cls}`}>{b.label}</span>
}

export function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl bg-white p-4 shadow-sm">{children}</div>
}

export function Button({
  children, onClick, disabled, variant = 'primary',
}: { children: ReactNode; onClick?: () => void; disabled?: boolean; variant?: 'primary' | 'ghost' }) {
  const base = 'w-full rounded-xl px-4 py-3 text-base font-semibold disabled:opacity-50'
  const cls = variant === 'primary' ? 'bg-[#ea1d2c] text-white' : 'bg-white text-[#ea1d2c] border border-[#ea1d2c]'
  return <button className={`${base} ${cls}`} onClick={onClick} disabled={disabled}>{children}</button>
}

export const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
