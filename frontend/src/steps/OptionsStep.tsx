import { t } from '../accessibility/i18n'
import { SpeakButton } from '../components/SpeakButton'
import type { ApiError } from '../api'
import { Icon } from '../components/icons'
import type { IconName } from '../components/icons'
import { AgentNote, Button, Card, Limitations, Loading, Notice, StageTitle, focusRing } from '../components/ui'
import type { MealOption, Strategy } from '../types'

export const STRATEGY: Record<Strategy, { label: string; icon: IconName; cls: string }> = {
  USE_WHAT_I_HAVE: { label: 'Aproveitar o que tenho', icon: 'leaf', cls: 'bg-success-soft text-success' },
  COMPLETE_WITH_MARKET: { label: 'Completar no Mercado', icon: 'store', cls: 'bg-tomato-soft text-tomato' },
  CONVENIENCE: { label: 'Conveniência', icon: 'bowl', cls: 'bg-amber-soft text-amber' },
}



export function StrategyTag({ s }: { s: Strategy }) {
  const st = STRATEGY[s]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-bold ${st.cls}`}>
      <Icon name={st.icon} className="size-4" />{t(st.label)}
    </span>
  )
}

export function OptionsStep({ message, options, limitations, onChoose, onEditItems, onEditTags, onRetry, loading, error }: {
  message: string
  options: MealOption[]
  limitations: string[]
  onChoose: (o: MealOption) => void
  onEditItems: () => void
  onEditTags: () => void
  onRetry: () => void
  loading: boolean
  error: ApiError | null
}) {

  return (
    <div className="space-y-4">
      <StageTitle kicker={t("Pensadas para sua despensa")}>{t("Qual vai ser a refeição de hoje?")}</StageTitle>
      <p className="text-ink-muted">{t("O agente pensou nas possibilidades. Escolha uma ideia; se faltar algo, ele busca para você.")}</p>

      <div className="profile-toolbar">
        <p className="text-sm">
          <span className="text-ink-muted">{t("Seu perfil é considerado em todas as opções.")}</span>
        </p>
        <div className="flex gap-1">
          <button type="button" onClick={onEditItems} disabled={loading}
            className={`inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-lg px-2 text-sm font-bold text-herb ${focusRing}`}>
            <Icon name="pencil" className="size-4" />{t(" Ingredientes ")}</button>
          <button type="button" onClick={onEditTags} disabled={loading}
            className={`inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-lg px-2 text-sm font-bold text-herb ${focusRing}`}>
            <Icon name="pencil" className="size-4" />{t(" Perfil ")}</button>
        </div>
      </div>

      {loading ? (
        <Loading label={t("Planejando refeições…")} detail={t("O agente está considerando seus ingredientes, objetivo e preferências.")} />
      ) : error ? (
        <>
          <Notice tone="danger" role="alert" title={t("Não deu para gerar sugestões")}>{t(error.message)}</Notice>
          <Button variant="secondary" icon="refresh" onClick={onRetry}>{t("Tentar novamente")}</Button>
        </>
      ) : (
        <>
          <SpeakButton text={[message, ...options.map(o => `${o.titulo}. ${o.justificativa}`)].join("\n")} />
          {message && <details className="quiet-details"><summary>{t("Entender as sugestões do agente")}</summary><AgentNote text={message} /></details>}
          {options.length === 0 ? (
            <Card className="space-y-3 text-center">
              <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-surface-2 text-ink-muted"><Icon name="bowl" /></span>
              <p className="font-bold">{t("O agente não trouxe sugestões de refeição desta vez.")}</p>
              <p className="text-sm text-ink-muted">{t("Veja a mensagem acima. Você pode ajustar os ingredientes ou pedir de novo.")}</p>
              <Button variant="secondary" icon="refresh" onClick={onRetry}>{t("Pedir sugestões de novo")}</Button>
            </Card>
          ) : (
            <ul className="meal-grid" aria-label={t("Opções sugeridas")}>
              {options.map((o, i) => (
                <Card as="li" key={`${i}-${o.titulo}`} className="meal-card">
                  <div className={`meal-card-top ${o.estrategia === 'USE_WHAT_I_HAVE' ? 'is-pantry' : o.estrategia === 'COMPLETE_WITH_MARKET' ? 'is-market' : ''}`}>
                    <span className="text-sm font-semibold">{t(STRATEGY[o.estrategia].label)}</span>
                    <Icon name={STRATEGY[o.estrategia].icon} />
                  </div>
                  <div className="meal-card-body">
                  <span className="source-label"><Icon name="sparkle" className="size-3" />{t(" Sugestão do agente")}</span>
                  <h3 className="text-xl font-bold">{o.titulo}</h3>
                  {o.justificativa && <p className="text-ink-muted">{o.justificativa}</p>}
                  <IngredientLine label={t("Você já tem")} items={o.usa} tone="have" />
                  <IngredientLine label={o.estrategia === 'CONVENIENCE' ? t("Para comprar") : t("Falta")} items={o.faltantes} tone="missing" />
                  <div className="rounded-xl bg-surface-2 p-3 text-sm">
                    <p className="font-bold">{t("Para acompanhar, se quiser")}</p>
                    <p className="text-ink-muted">{o.complementos_opcionais?.length ? o.complementos_opcionais.map((c) => c.nome).join(' · ') : t("O agente pode sugerir um acompanhamento opcional no iFood.")}</p>
                    <p className="mt-1 text-xs text-ink-muted">{t("Opcional, sem consulta ou compra automática.")}</p>
                  </div>
                  <Button variant="secondary" icon={o.faltantes.length ? 'store' : 'check'} onClick={() => onChoose(o)}>
                    {o.faltantes.length ? t("Quero esta · buscar faltantes") : t("Escolher esta refeição")}
                  </Button>
                  </div>
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
    return tone === 'missing' ? <p className="text-sm font-semibold text-success">{t("Nada a comprar.")}</p> : null
  }
  return (
    <div>
      <p className="mb-1 text-sm font-bold">{t(label)}</p>
      <ul className="flex flex-wrap gap-1.5">
        {items.map((n) => (
          <li key={n} className={`rounded-full px-2.5 py-1 text-sm font-semibold ${
            tone === 'have' ? 'bg-success-soft text-success' : 'bg-tomato-soft text-tomato'
          }`}>{n}</li>
        ))}
      </ul>
    </div>
  )
}
