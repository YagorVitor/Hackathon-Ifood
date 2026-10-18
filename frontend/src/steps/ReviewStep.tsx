import { t } from '../accessibility/i18n'
import { useState } from 'react'
import type { ApiError } from '../api'
import { Icon } from '../components/icons'
import { AgentNote, Badge, Button, Card, Loading, Notice, StageTitle, focusRing, inputCls } from '../components/ui'
import { LIMITS, itemError, newKey, normalized, validateFields } from '../flow'
import type { DeclaredFields, DraftItem } from '../flow'

export function ReviewStep({
  text, agentMessage, items, onItems, fields, onFields, onConfirm, onEditText, loading, error, onProfile, photoBased,
}: {
  photoBased: boolean
  text: string
  agentMessage: string
  items: DraftItem[]
  onItems: (v: DraftItem[]) => void
  fields: DeclaredFields
  onFields: (v: DeclaredFields) => void
  onConfirm: () => void
  onEditText: () => void
  loading: boolean
  error: ApiError | null
  onProfile: () => void
}) {
  const [newName, setNewName] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const fieldErrors = validateFields(fields)
  const itemErrors = items.map(itemError)
  const invalid = items.length === 0 || itemErrors.some(Boolean) || Object.keys(fieldErrors).length > 0
  const inferredCount = items.filter((i) => i.origem === 'INFERRED').length

  const update = (key: string, patch: Partial<DraftItem>) =>
    // Qualquer correção feita pela pessoa passa a ser um dado declarado.
    onItems(items.map((i) => (i.key === key ? { ...i, ...patch, origem: 'DECLARED' } : i)))

  const add = () => {
    const nome = newName.trim()
    if (!nome) return setAddError('Digite o nome do ingrediente.')
    if (items.some((i) => normalized(i.nome) === normalized(nome))) return setAddError(`"${nome}" já está na lista.`)
    if (items.length >= LIMITS.items) return setAddError(`Limite de ${LIMITS.items} ingredientes.`)
    onItems([...items, { key: newKey(), nome, quantidade: '', unidade: '', origem: 'DECLARED' }])
    setNewName('')
    setAddError(null)
  }

  const field = (k: keyof DeclaredFields, label: string, opts: { inputMode?: 'numeric' | 'decimal' | 'text'; placeholder?: string }) => (
    <div>
      <label htmlFor={`f-${k}`} className="mb-1 block text-sm font-bold">{t(label)}</label>
      <input
          id={`f-${k}`}
          className={inputCls}
          inputMode={opts.inputMode ?? 'text'}
          placeholder={opts.placeholder}
          maxLength={LIMITS.text}
          value={fields[k]}
          aria-invalid={!!fieldErrors[k]}
          aria-describedby={fieldErrors[k] ? `f-${k}-err` : undefined}
          onChange={(e) => onFields({ ...fields, [k]: e.target.value })}
          disabled={loading}
        />
      {fieldErrors[k] && <p id={`f-${k}-err`} className="mt-1 text-sm font-semibold text-tomato">{t(fieldErrors[k] ?? '')}</p>}
    </div>
  )

  return (
    <div className="space-y-4">
      <StageTitle kicker={t("Sua despensa organizada")}>{t("Só confira. O resto é com o agente.")}</StageTitle>
      <p className="text-ink-muted">{t("Separei os ingredientes e os detalhes do seu pedido. Corrija o que precisar antes de planejar.")}</p>

      <details className="quiet-details">
        <summary>{t("Rever meu pedido original")}</summary>
        <div className="mt-2 flex items-start gap-3"><p className="flex-1 whitespace-pre-line text-sm">“{text}”</p><Button variant="ghost" full={false} icon="pencil" onClick={onEditText} disabled={loading}>{t("Editar")}</Button></div>
      </details>

      {agentMessage && <details className="quiet-details"><summary>{t("Ver interpretação do agente")}</summary><AgentNote text={agentMessage} /></details>}

      <Card as="section" className="space-y-3">
        <div>
          <h3 className="text-lg font-bold">{t("O que você tem")}</h3>
          <p className="text-sm text-ink-muted">
            {inferredCount > 0
              ? photoBased ? t("Possíveis ingredientes reconhecidos na foto. Confira os nomes: a imagem não comprova quantidade, validade ou segurança.") : 'Reconhecidos pela IA. Confira os nomes; quantidade e unidade são opcionais.'
              : t("Confira a lista. Quantidade e unidade são opcionais.")}
          </p>
        </div>

        {items.length === 0 && (
          <Notice tone="info" title={t("Nenhum ingrediente na lista")}>
            <p>{photoBased ? t("Não foi possível identificar alimentos nesta foto. Envie uma imagem mais nítida ou adicione os ingredientes abaixo.") : t("O agente não reconheceu ingredientes no seu texto. Adicione abaixo o que você tem em casa.")}</p>
            {photoBased && <Button variant="secondary" full={false} icon="camera" onClick={onEditText}>{t("Trocar a foto")}</Button>}
          </Notice>
        )}

        <ul className="ingredient-grid">
          {items.map((it, idx) => {
            const err = itemErrors[idx]
            return (
              <li key={it.key}
                className={`ingredient-editor rounded-xl border p-3 ${it.origem === 'INFERRED' ? 'border-line bg-surface' : 'border-line bg-surface'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="ingredient-name"><Icon name="jar" className="size-4" />{it.nome}</span>
                  <Badge p={it.origem} label={it.origem === 'INFERRED' ? t("Reconhecido pela IA") : undefined} />
                  <button type="button" onClick={() => onItems(items.filter((x) => x.key !== it.key))} disabled={loading}
                    aria-label={t('Remover {item}', { item: it.nome || t('Ingrediente') })}
                    className={`inline-flex size-11 cursor-pointer items-center justify-center rounded-lg text-ink-muted hover:bg-surface-2 hover:text-tomato ${focusRing}`}>
                    <Icon name="trash" />
                  </button>
                </div>
                <details className="ingredient-adjust" open={err ? true : undefined}><summary>{t("Editar ingrediente")}</summary><div className="mt-3 grid grid-cols-[1fr] gap-2">
                  <div>
                    <label htmlFor={`n-${it.key}`} className="mb-1 block text-xs font-bold text-ink-muted">{t("Ingrediente")}</label>
                    <input id={`n-${it.key}`} className={inputCls} value={it.nome} maxLength={LIMITS.text}
                      aria-invalid={!!err} aria-describedby={err ? `e-${it.key}` : undefined}
                      onChange={(e) => update(it.key, { nome: e.target.value })} disabled={loading} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor={`q-${it.key}`} className="mb-1 block text-xs font-bold text-ink-muted">{t("Quantidade")}</label>
                      <input id={`q-${it.key}`} className={inputCls} inputMode="decimal" placeholder="—" value={it.quantidade}
                        onChange={(e) => update(it.key, { quantidade: e.target.value })} disabled={loading} />
                    </div>
                    <div>
                      <label htmlFor={`u-${it.key}`} className="mb-1 block text-xs font-bold text-ink-muted">{t("Unidade")}</label>
                      <input id={`u-${it.key}`} className={inputCls} placeholder={t("un, g, kg…")} value={it.unidade} maxLength={LIMITS.text}
                        onChange={(e) => update(it.key, { unidade: e.target.value })} disabled={loading} />
                    </div>
                  </div>
                </div>
                </details>
                {err && <p id={`e-${it.key}`} className="mt-2 text-sm font-semibold text-tomato">{t(err)}</p>}
              </li>
            )
          })}
        </ul>

        <form className="flex items-start gap-2" onSubmit={(e) => { e.preventDefault(); add() }}>
          <div className="flex-1">
            <label htmlFor="new-item" className="sr-only">{t("Adicionar ingrediente")}</label>
            <input id="new-item" className={inputCls} placeholder={t("Adicionar ingrediente")} value={newName} maxLength={LIMITS.text}
              aria-invalid={!!addError} aria-describedby={addError ? 'new-item-err' : undefined}
              onChange={(e) => { setNewName(e.target.value); setAddError(null) }} disabled={loading} />
            {addError && <p id="new-item-err" className="mt-1 text-sm font-semibold text-tomato">{addError}</p>}
          </div>
          <Button type="submit" variant="secondary" icon="plus" full={false} disabled={loading}>{t("Adicionar")}</Button>
        </form>
      </Card>

      <details className="preferences-disclosure objective-disclosure" open={Object.keys(fieldErrors).length ? true : undefined}>
        <summary><span className="objective-summary"><span className="flex items-center gap-2"><Icon name="bowl" className="size-5" />{t(" Seu pedido")}</span><span className="objective-preview">{[fields.objetivo, fields.pessoas && `${fields.pessoas} pessoas`, fields.tempo && `${fields.tempo} min`, fields.orcamento && `até R$ ${fields.orcamento}`].filter(Boolean).join(' · ') || t("Objetivo, pessoas, tempo e orçamento são opcionais.")}</span></span><span className="optional-label">{t("Ajustar +")}</span></summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {field('objetivo', t("Objetivo"), { placeholder: 'ex.: jantar' })}
          {field('pessoas', t("Pessoas"), { inputMode: 'numeric', placeholder: 'ex.: 2' })}
          {field('tempo', t("Tempo disponível (minutos)"), { inputMode: 'numeric', placeholder: 'ex.: 30' })}
          {field('orcamento', t("Orçamento (R$)"), { inputMode: 'decimal', placeholder: 'ex.: 35,00' })}
        </div>
        <p className="mt-3 text-xs text-ink-muted">{t("O agente interpretou os detalhes do texto. Ao continuar, você confirma estes dados.")}</p>
      </details>

      <p className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink-muted">{t(" Seu perfil é reutilizado nas sugestões; não é preciso informar de novo. ")}<Button variant="ghost" full={false} onClick={onProfile} disabled={loading}>{t("Meu perfil")}</Button>
      </p>

      {loading && <Loading label={t("Planejando refeições…")} detail={t("O agente está considerando seus ingredientes, objetivo e preferências.")} />}
      {error && !loading && <Notice tone="danger" role="alert" title={t("Não deu para gerar sugestões")}>{t(error.message)}</Notice>}

      <div className="review-actions"><Button icon="check" onClick={onConfirm} disabled={invalid} loading={loading}>{t(" Confirmar e receber sugestões ")}<span aria-hidden="true">→</span>
      </Button></div>
      {items.length === 0 && <p className="text-center text-sm text-ink-muted">{t("Adicione pelo menos um ingrediente para continuar.")}</p>}
    </div>
  )
}
