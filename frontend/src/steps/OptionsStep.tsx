import type { ApiError } from '../api'
import { Icon } from '../components/icons'
import type { IconName } from '../components/icons'
import { AgentNote, Badge, Button, Card, Limitations, Loading, Notice, StageTitle, focusRing } from '../components/ui'
import { hasSensitive } from '../flow'
import type { DeclaredTags, MealOption, Strategy } from '../types'

export const STRATEGY: Record<Strategy, { label: string; icon: IconName; cls: string }> = {
  USE_WHAT_I_HAVE: { label: 'Aproveitar o que tenho', icon: 'leaf', cls: 'bg-herb-soft text-herb' },
  COMPLETE_WITH_MARKET: { label: 'Completar no Mercado', icon: 'store', cls: 'bg-tomato-soft text-tomato' },
  CONVENIENCE: { label: 'Conveniência', icon: 'bowl', cls: 'bg-amber-soft text-amber' },
}

const PREF_LABEL = { VEGETARIAN: 'Vegetariano', VEGAN: 'Vegano' } as const

export function StrategyTag({ s }: { s: Strategy }) {
  const st = STRATEGY[s]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-bold ${st.cls}`}>
      <Icon name={st.icon} className="size-4" />{st.label}
    </span>
  )
}

export function OptionsStep({ message, options, limitations, tags, consent, onChoose, onEditItems, onEditTags, onRetry, loading, error }: {
  message: string
  options: MealOption[]
  limitations: string[]
  tags: DeclaredTags
  consent: boolean
  onChoose: (o: MealOption) => void
  onEditItems: () => void
  onEditTags: () => void
  onRetry: () => void
  loading: boolean
  error: ApiError | null
}) {
  const prefs = tags.preferencias.map((p) => PREF_LABEL[p])
  const sensitiveCount = consent ? tags.alergias.length + tags.intolerancias.length + tags.condicoes_saude.length : 0
  const profileText = tags.estado === 'DECLINED' && prefs.length === 0 && !hasSensitive(tags)
    ? 'Você preferiu não informar.'
    : [prefs.join(', '), sensitiveCount ? `${sensitiveCount} restrição(ões) sensível(is) autorizada(s)` : '']
        .filter(Boolean).join(' · ') || 'Nenhuma informada.'

  return (
    <div className="space-y-4">
      <StageTitle kicker="Etapa 3 de 4">Sugestões para hoje</StageTitle>

      <Card className="flex flex-wrap items-center justify-between gap-2 py-3">
        <p className="text-sm">
          <span className="font-bold">Perfil enviado ao agente:</span> <span className="text-ink-muted">{profileText}</span>
        </p>
        <div className="flex gap-1">
          <button type="button" onClick={onEditItems} disabled={loading}
            className={`inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-lg px-2 text-sm font-bold text-herb ${focusRing}`}>
            <Icon name="pencil" className="size-4" /> Ingredientes
          </button>
          <button type="button" onClick={onEditTags} disabled={loading}
            className={`inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-lg px-2 text-sm font-bold text-herb ${focusRing}`}>
            <Icon name="pencil" className="size-4" /> Perfil
          </button>
        </div>
      </Card>

      {loading ? (
        <Loading label="Planejando refeições…" detail="O agente está considerando seus ingredientes, objetivo e preferências." />
      ) : error ? (
        <>
          <Notice tone="danger" role="alert" title="Não deu para gerar sugestões">{error.message}</Notice>
          <Button variant="secondary" icon="refresh" onClick={onRetry}>Tentar novamente</Button>
        </>
      ) : (
        <>
          <AgentNote text={message} />
          {options.length === 0 ? (
            <Card className="space-y-3 text-center">
              <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-surface-2 text-ink-muted"><Icon name="bowl" /></span>
              <p className="font-bold">O agente não trouxe sugestões de refeição desta vez.</p>
              <p className="text-sm text-ink-muted">Veja a mensagem acima. Você pode ajustar os ingredientes ou pedir de novo.</p>
              <Button variant="secondary" icon="refresh" onClick={onRetry}>Pedir sugestões de novo</Button>
            </Card>
          ) : (
            <ul className="space-y-3" aria-label="Opções sugeridas">
              {options.map((o, i) => (
                <Card as="li" key={`${i}-${o.titulo}`} className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <StrategyTag s={o.estrategia} />
                    <Badge p="INFERRED" />
                  </div>
                  <h3 className="text-xl font-bold">{o.titulo}</h3>
                  {o.justificativa && <p className="text-ink-muted">{o.justificativa}</p>}
                  <IngredientLine label="Você já tem" items={o.usa} tone="have" />
                  <IngredientLine label={o.estrategia === 'CONVENIENCE' ? 'Para comprar' : 'Falta'} items={o.faltantes} tone="missing" />
                  <Button variant="secondary" icon={o.faltantes.length ? 'store' : 'check'} onClick={() => onChoose(o)}>
                    {o.faltantes.length ? 'Escolher e buscar o que falta' : 'Escolher — sem compras'}
                  </Button>
                </Card>
              ))}
            </ul>
          )}
          <Limitations items={limitations} />
        </>
      )}
    </div>
  )
}

export function IngredientLine({ label, items, tone }: { label: string; items: string[]; tone: 'have' | 'missing' }) {
  if (items.length === 0) {
    return tone === 'missing' ? <p className="text-sm font-semibold text-herb">Nada a comprar.</p> : null
  }
  return (
    <div>
      <p className="mb-1 text-sm font-bold">{label}</p>
      <ul className="flex flex-wrap gap-1.5">
        {items.map((n) => (
          <li key={n} className={`rounded-full px-2.5 py-1 text-sm font-semibold ${
            tone === 'have' ? 'bg-herb-soft text-herb' : 'border-2 border-dashed border-tomato/50 text-tomato'
          }`}>{n}</li>
        ))}
      </ul>
    </div>
  )
}
