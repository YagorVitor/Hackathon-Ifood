import { t } from '../accessibility/i18n'
import { useId, useState } from 'react'
import type { ApiError } from '../api'
import { Icon } from '../components/icons'
import { Badge, Button, Card, Chip, Loading, Notice, StageTitle, focusRing, inputCls } from '../components/ui'
import { LIMITS, hasSensitive, normalized } from '../flow'
import type { DeclaredTags, Preference } from '../types'

const PREFS: [Preference, string][] = [['VEGETARIAN', 'Vegetariano'], ['VEGAN', 'Vegano'], ['ORGANIC', 'Orgânico']]
type SensitiveKey = 'alergias' | 'intolerancias' | 'condicoes_saude'

export function TagsStep({ mode, tags, consent, onSubmit, onDecline, onCancel, loading, error, remember, onForget, storageError }: {
  remember: boolean
  onForget: () => void
  storageError: string | null
  mode: 'question' | 'edit'
  tags: DeclaredTags
  consent: boolean
  onSubmit: (tags: DeclaredTags, consent: boolean, remember: boolean) => void
  onDecline: () => void
  onCancel?: () => void
  loading: boolean
  error: ApiError | null
}) {
  const [draft, setDraft] = useState<DeclaredTags>(tags)
  const [allow, setAllow] = useState(consent)
  const [keep, setKeep] = useState(remember)
  const sensitive = hasSensitive(draft)
  const any = draft.preferencias.length > 0 || sensitive

  const toggleConsent = (on: boolean) => {
    setAllow(on)
    if (!on) setDraft((d) => ({ ...d, alergias: [], intolerancias: [], condicoes_saude: [] }))
  }

  return (
    <div className="space-y-4">
      <StageTitle kicker={mode === 'question' ? t("Antes das sugestões") : t("Meu perfil")}>
        {mode === 'question' ? t("O agente quer saber") : t("Seu perfil acompanha suas escolhas")}
      </StageTitle>

      {mode === 'question' && (
        <Card className="space-y-2 border-violet/30 bg-violet-soft">
          <Badge p="INFERRED" label={t("Pergunta do agente")} />
          <p className="text-lg text-ink">{t(" Você tem preferência vegetariana ou vegana, alergia, intolerância ou alguma restrição de saúde relevante, como diabetes? ")}</p>
          <p className="text-sm text-ink-muted">{t("É opcional — você pode pular. O agente não deduz essas informações por conta própria.")}</p>
        </Card>
      )}

      <p className="text-sm text-ink-muted">{t("Informe uma vez e o agente reutiliza este perfil em novas sugestões e complementos. É um perfil desta aplicação, independente da conta iFood.")}</p>
      <PreferenceFields draft={draft} onDraft={setDraft} allow={allow} onAllow={toggleConsent} disabled={loading} />

      <Card className="space-y-2">
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" className="mt-1 size-5 accent-[var(--herb)]" checked={keep} onChange={(e) => setKeep(e.target.checked)} disabled={loading} />
          <span><b>{t("Lembrar meu perfil neste navegador")}</b><span className="block text-sm text-ink-muted">{t("Inclui os dados sensíveis que você autorizou acima. Ficam no armazenamento local deste navegador, não no perfil do iFood. Sem esta opção, o perfil dura apenas nesta aba.")}</span></span>
        </label>
      </Card>
      {storageError && <Notice tone="warn" role="alert">{t(storageError)}</Notice>}
      {loading && <Loading label={t("Atualizando sugestões…")} detail={t("O agente está planejando com o seu perfil.")} />}
      {error && !loading && <Notice tone="danger" role="alert" title={t("Não deu para gerar sugestões")}>{t(error.message)}</Notice>}

      <div className="space-y-2">
        <Button icon="check" loading={loading}
          disabled={mode === 'question' && !any}
          onClick={() => onSubmit({ ...draft, estado: 'ANSWERED' }, allow && sensitive, keep)}>
          {mode === 'question' ? t("Continuar com essas informações") : t("Salvar meu perfil")}
        </Button>
        {mode === 'question' ? (
          <Button variant="secondary" onClick={onDecline} disabled={loading}>{t("Prefiro não informar")}</Button>
        ) : (
          <Button variant="ghost" icon="back" onClick={onCancel} disabled={loading}>{t("Voltar sem alterar")}</Button>
        )}
        {mode === 'edit' && <Button variant="ghost" icon="trash" onClick={onForget} disabled={loading}>{t("Apagar meu perfil")}</Button>}
      </div>
    </div>
  )
}

export function PreferenceFields({ draft, onDraft, allow, onAllow, disabled = false }: {
  draft: DeclaredTags
  onDraft: (tags: DeclaredTags) => void
  allow: boolean
  onAllow: (allow: boolean) => void
  disabled?: boolean
}) {
  const loading = disabled
  const togglePref = (p: Preference) => onDraft({ ...draft,
    preferencias: draft.preferencias.includes(p) ? draft.preferencias.filter((x) => x !== p) : [...draft.preferencias, p],
  })
  const setList = (k: SensitiveKey, values: string[]) => onDraft({ ...draft, [k]: values })
  const toggleConsent = (on: boolean) => {
    onAllow(on)
    if (!on) onDraft({ ...draft, alergias: [], intolerancias: [], condicoes_saude: [] })
  }
  return <div className="space-y-4">
      <Card as="section" className="space-y-3">
        <h3 className="text-lg font-bold">{t("Preferência alimentar")}</h3>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("Preferência alimentar")}>
          {PREFS.map(([k, label]) => (
            <Chip key={k} pressed={draft.preferencias.includes(k)} onClick={() => togglePref(k)} disabled={loading}>{t(label)}</Chip>
          ))}
        </div>
        <p className="text-sm text-ink-muted">{t(" Usada no planejamento e como filtro de catálogo na busca do iFood. O filtro é a classificação do catálogo, não uma verificação dos ingredientes. ")}</p>
      </Card>

      <Card as="section" className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-blue"><Icon name="shield" /></span>
          <h3 className="text-lg font-bold">{t("Alergias, intolerâncias e saúde")}</h3>
        </div>
        <p className="text-sm text-ink-muted">{t(" São dados sensíveis e totalmente opcionais. Ficam separados das preferências e só são usados com sua autorização. ")}</p>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-line p-3">
          <input type="checkbox" className="mt-1 size-5 shrink-0 accent-[var(--herb)]" checked={allow}
            onChange={(e) => toggleConsent(e.target.checked)} disabled={loading} />
          <span className="text-sm">
            <b>{t("Autorizo usar essas informações")}</b>{t(" nas sugestões e complementos. Elas vão para o agente de IA para considerar seu contexto e sinalizar riscos. Só serão lembradas neste navegador se você escolher a opção abaixo. Intolerância à lactose ou ao glúten também vira filtro de catálogo (“sem lactose”, “sem glúten”) na busca do iFood. ")}</span>
        </label>

        {allow ? (
          <div className="space-y-4">
            <TagList label={t("Alergias alimentares")} placeholder={t("ex.: amendoim")} values={draft.alergias}
              onChange={(v) => setList('alergias', v)} disabled={loading} />
            <TagList label={t("Intolerâncias")} placeholder={t("ex.: lactose")} suggestions={['lactose', t("glúten")]}
              values={draft.intolerancias} onChange={(v) => setList('intolerancias', v)} disabled={loading} />
            <TagList label={t("Condições de saúde")} placeholder={t("ex.: diabetes")} suggestions={['diabetes']}
              values={draft.condicoes_saude} onChange={(v) => setList('condicoes_saude', v)} disabled={loading} />
            {(draft.alergias.length > 0 || draft.intolerancias.length > 0) && (
              <Notice tone="warn" title={t("Sobre alergias e intolerâncias")}>{t(" O agente evita recomendar de propósito o que você declarou, mas a ausência de informação sobre alérgenos não significa que um produto é seguro. Confira sempre o rótulo e a contaminação cruzada. ")}</Notice>
            )}
            {draft.condicoes_saude.length > 0 && (
              <Notice tone="warn" title={t("Sobre condições de saúde")}>{t(" O agente não oferece diagnóstico, tratamento nem garantia de adequação clínica. Diabetes, por exemplo, não ativa nenhum filtro automático. Para critérios alimentares, siga a orientação de um profissional. ")}</Notice>
            )}
          </div>
        ) : (
          <p className="text-sm text-ink-muted">{t("Sem autorização, nenhum dado sensível é enviado.")}</p>
        )}
      </Card>

  </div>
}

function TagList({ label, placeholder, values, onChange, suggestions = [], disabled }: {
  label: string
  placeholder: string
  values: string[]
  onChange: (v: string[]) => void
  suggestions?: string[]
  disabled?: boolean
}) {
  const id = useId()
  const [value, setValue] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const has = (v: string) => values.some((x) => normalized(x) === normalized(v))
  const add = (raw: string) => {
    const v = raw.trim()
    if (!v) return
    if (has(v)) return setErr(`"${v}" já foi adicionado.`)
    if (values.length >= LIMITS.tagValues) return setErr(`Limite de ${LIMITS.tagValues} itens.`)
    onChange([...values, v])
    setValue('')
    setErr(null)
  }
  const open = suggestions.filter((s) => !has(s))

  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-bold">{t(label)}</legend>
      {values.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {values.map((v) => (
            <li key={v} className="inline-flex min-h-11 items-center gap-1 rounded-full bg-blue-soft pl-3 text-sm font-semibold text-blue">
              {v}
              <button type="button" aria-label={t('Remover {item}', { item: v })} onClick={() => onChange(values.filter((x) => x !== v))} disabled={disabled}
                className={`inline-flex size-11 cursor-pointer items-center justify-center rounded-full ${focusRing}`}>
                <Icon name="x" className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {open.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {open.map((s) => (
            <button key={s} type="button" onClick={() => add(s)} disabled={disabled}
              className={`inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-full border-2 border-dashed border-line px-3 text-sm font-semibold hover:border-herb ${focusRing}`}>
              <Icon name="plus" className="size-4" />{s}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <label htmlFor={id} className="sr-only">{`Adicionar em ${t(label)}`}</label>
        <input id={id} className={inputCls} placeholder={placeholder} value={value} maxLength={LIMITS.text} disabled={disabled}
          aria-invalid={!!err} aria-describedby={err ? `${id}-err` : undefined}
          onChange={(e) => { setValue(e.target.value); setErr(null) }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(value) } }} />
        <Button variant="secondary" full={false} icon="plus" onClick={() => add(value)} disabled={disabled || !value.trim()}>
          <span className="sr-only sm:not-sr-only">{t("Adicionar")}</span>
        </Button>
      </div>
      {err && <p id={`${id}-err`} className="text-sm font-semibold text-tomato">{t(err)}</p>}
    </fieldset>
  )
}
