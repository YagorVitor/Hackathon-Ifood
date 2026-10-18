import { focusRing } from './styles'
import { t } from '../accessibility/i18n'
import { SpeakButton } from './SpeakButton'
import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { Provenance } from '../types'
import { Icon } from './icons'
import type { IconName } from './icons'

// Cada procedência tem ícone + texto, para não depender só da cor.
export const PROVENANCE: Record<Provenance, { label: string; hint: string; icon: IconName; cls: string }> = {
  DECLARED: {
    label: 'Você informou', hint: 'Dado digitado ou confirmado por você.',
    icon: 'user', cls: 'bg-blue-soft text-blue',
  },
  INFERRED: {
    label: 'Sugerido pela IA', hint: 'Interpretação do agente; pode estar errada.',
    icon: 'sparkle', cls: 'bg-violet-soft text-violet',
  },
  MCP: {
    label: 'Dado do iFood (MCP)', hint: 'Retornado pela ferramenta oficial do iFood nesta consulta.',
    icon: 'store', cls: 'bg-tomato-soft text-tomato',
  },
  ESTIMATED: {
    label: 'Estimativa', hint: 'Cálculo do backend com os dados conhecidos; não é valor final.',
    icon: 'approx', cls: 'bg-amber-soft text-amber',
  },
}

export function Badge({ p, label }: { p: Provenance; label?: string }) {
  const b = PROVENANCE[p]
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${b.cls}`}>
      <Icon name={b.icon} className="size-3.5" />
      {t(label ?? b.label)}
    </span>
  )
}

export function Card({ children, className = '', as: Tag = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'section' | 'article' | 'li' }) {
  return <Tag className={`rounded-2xl border border-line bg-surface p-4 sm:p-5 ${className}`}>{children}</Tag>
}

type Variant = 'primary' | 'secondary' | 'ghost'
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-herb text-on-herb hover:brightness-95 disabled:bg-surface-2 disabled:text-ink-muted disabled:hover:brightness-100',
  secondary: 'border border-line bg-surface text-ink hover:border-herb hover:text-herb hover:bg-herb-soft',
  ghost: 'text-ink hover:bg-surface-2',
}

export { focusRing } from './styles'

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant; loading?: boolean; icon?: IconName; full?: boolean
}>(function Button({ variant = 'primary', loading, icon, full = true, children, className = '', disabled, type = 'button', ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-[filter,background-color] duration-150 disabled:cursor-not-allowed disabled:opacity-55 ${full ? 'w-full' : ''} ${VARIANTS[variant]} ${focusRing} ${className}`}
      {...rest}
    >
      {loading ? <Spinner /> : icon && <Icon name={icon} />}
      {children}
    </button>
  )
})

export function Chip({ pressed, onClick, children, disabled }: { pressed: boolean; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border-2 px-4 text-sm font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-55 ${focusRing} ${
        pressed ? 'border-herb bg-herb text-on-herb' : 'border-line bg-surface text-ink hover:border-herb'
      }`}
    >
      {pressed && <Icon name="check" className="size-4" />}
      {children}
    </button>
  )
}

export function Spinner({ className = 'size-5' }: { className?: string }) {
  return (
    <span className="motion-safe:animate-spin inline-flex">
      <Icon name="loader" className={className} />
    </span>
  )
}

type Tone = 'info' | 'warn' | 'danger' | 'success'
const TONES: Record<Tone, { cls: string; icon: IconName }> = {
  info: { cls: 'border-blue/30 bg-blue-soft text-ink', icon: 'info' },
  warn: { cls: 'border-amber/40 bg-amber-soft text-ink', icon: 'alert' },
  danger: { cls: 'border-tomato/40 bg-tomato-soft text-ink', icon: 'alert' },
  success: { cls: 'border-success/40 bg-success-soft text-ink', icon: 'check' },
}
const TONE_ICON: Record<Tone, string> = { info: 'text-blue', warn: 'text-amber', danger: 'text-tomato', success: 'text-success' }

export function Notice({ tone = 'info', title, children, role }: { tone?: Tone; title?: string; children?: ReactNode; role?: 'alert' | 'status' }) {
  const toneStyle = TONES[tone]
  return (
    <div role={role} className={`flex gap-3 rounded-xl border p-3 text-sm ${toneStyle.cls}`}>
      <span className={TONE_ICON[tone]}><Icon name={toneStyle.icon} /></span>
      <div className="min-w-0 space-y-1">
        {title && <p className="font-bold">{t(title)}</p>}
        {children}
      </div>
    </div>
  )
}

export function Loading({ label, detail }: { label: string; detail?: string }) {
  return (
    <div role="status" className="flex items-center gap-3 rounded-2xl border border-dashed border-herb/50 bg-herb-soft p-4 text-ink">
      <span className="text-herb"><Spinner className="size-6" /></span>
      <div>
        <p className="font-bold">{t(label)}</p>
        {detail && <p className="text-sm text-ink-muted">{t(detail)}</p>}
      </div>
    </div>
  )
}

export function AgentNote({ text }: { text: string }) {
  if (!text.trim()) return null
  return (
    <figure className="rounded-2xl border border-violet/30 bg-violet-soft p-4">
      <figcaption className="mb-2"><Badge p="INFERRED" label={t("Mensagem do agente")} /></figcaption>
      <blockquote className="whitespace-pre-line text-ink">{text}</blockquote>
      <SpeakButton text={text} />
    </figure>
  )
}

export function StageTitle({ children, kicker }: { children: ReactNode; kicker?: string }) {
  return (
    <div>
      {kicker && <p className="text-sm font-bold uppercase tracking-wide text-herb">{t(kicker)}</p>}
      <h1 id="stage-title" tabIndex={-1} className="text-2xl font-bold leading-tight text-ink outline-none sm:text-3xl">
        {children}
      </h1>
    </div>
  )
}

export const inputCls = `w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted ${focusRing} aria-[invalid=true]:border-tomato`

export const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
