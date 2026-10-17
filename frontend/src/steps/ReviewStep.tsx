import { useState } from 'react'
import type { ApiError } from '../api'
import { Icon } from '../components/icons'
import { AgentNote, Badge, Button, Card, Loading, Notice, StageTitle, focusRing, inputCls } from '../components/ui'
import { LIMITS, itemError, newKey, normalized, validateFields } from '../flow'
import type { DeclaredFields, DraftItem } from '../flow'

export function ReviewStep({
  text, agentMessage, items, onItems, fields, onFields, onConfirm, onEditText, loading, error, nextIsTags,
}: {
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
  nextIsTags: boolean
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
      <label htmlFor={`f-${k}`} className="mb-1 block text-sm font-bold">{label}</label>
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
      {fieldErrors[k] && <p id={`f-${k}-err`} className="mt-1 text-sm font-semibold text-tomato">{fieldErrors[k]}</p>}
    </div>
  )

  return (
    <div className="space-y-4">
      <StageTitle kicker="Etapa 2 de 4">Confira seus ingredientes</StageTitle>

      <Card className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge p="DECLARED" label="Seu pedido" />
          <button type="button" onClick={onEditText} disabled={loading}
            className={`inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-lg px-2 text-sm font-bold text-herb ${focusRing}`}>
            <Icon name="pencil" className="size-4" /> Reescrever
          </button>
        </div>
        <p className="whitespace-pre-line text-ink">“{text}”</p>
      </Card>

      <AgentNote text={agentMessage} />
      {nextIsTags && (
        <Notice tone="info">
          O agente perguntou sobre preferências e restrições. Você responde (ou pula) logo depois de confirmar os ingredientes.
        </Notice>
      )}

      <Card as="section" className="space-y-3">
        <div>
          <h3 className="text-lg font-bold">O que você tem</h3>
          <p className="text-sm text-ink-muted">
            {inferredCount > 0
              ? 'Itens com borda tracejada foram reconhecidos pela IA e ainda são hipóteses. Corrija, complete ou remova antes de confirmar. Não presumimos quantidades nem validade.'
              : 'Confira a lista. Quantidade e unidade são opcionais.'}
          </p>
        </div>

        {items.length === 0 && (
          <Notice tone="info" title="Nenhum ingrediente na lista">
            O agente não reconheceu ingredientes no seu texto. Adicione abaixo o que você tem em casa.
          </Notice>
        )}

        <ul className="space-y-3">
          {items.map((it, idx) => {
            const err = itemErrors[idx]
            return (
              <li key={it.key}
                className={`rounded-xl border-2 p-3 ${it.origem === 'INFERRED' ? 'border-dashed border-violet/50 bg-violet-soft/40' : 'border-line bg-surface'}`}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Badge p={it.origem} label={it.origem === 'INFERRED' ? 'Reconhecido pela IA' : undefined} />
                  <button type="button" onClick={() => onItems(items.filter((x) => x.key !== it.key))} disabled={loading}
                    aria-label={`Remover ${it.nome || 'item'}`}
                    className={`inline-flex size-11 cursor-pointer items-center justify-center rounded-lg text-ink-muted hover:bg-surface-2 hover:text-tomato ${focusRing}`}>
                    <Icon name="trash" />
                  </button>
                </div>
                <div className="grid grid-cols-[1fr] gap-2 sm:grid-cols-[2fr_1fr_1fr]">
                  <div>
                    <label htmlFor={`n-${it.key}`} className="mb-1 block text-xs font-bold text-ink-muted">Ingrediente</label>
                    <input id={`n-${it.key}`} className={inputCls} value={it.nome} maxLength={LIMITS.text}
                      aria-invalid={!!err} aria-describedby={err ? `e-${it.key}` : undefined}
                      onChange={(e) => update(it.key, { nome: e.target.value })} disabled={loading} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:contents">
                    <div>
                      <label htmlFor={`q-${it.key}`} className="mb-1 block text-xs font-bold text-ink-muted">Quantidade</label>
                      <input id={`q-${it.key}`} className={inputCls} inputMode="decimal" placeholder="—" value={it.quantidade}
                        onChange={(e) => update(it.key, { quantidade: e.target.value })} disabled={loading} />
                    </div>
                    <div>
                      <label htmlFor={`u-${it.key}`} className="mb-1 block text-xs font-bold text-ink-muted">Unidade</label>
                      <input id={`u-${it.key}`} className={inputCls} placeholder="un, g, kg…" value={it.unidade} maxLength={LIMITS.text}
                        onChange={(e) => update(it.key, { unidade: e.target.value })} disabled={loading} />
                    </div>
                  </div>
                </div>
                {err && <p id={`e-${it.key}`} className="mt-2 text-sm font-semibold text-tomato">{err}</p>}
              </li>
            )
          })}
        </ul>

        <form className="flex items-start gap-2" onSubmit={(e) => { e.preventDefault(); add() }}>
          <div className="flex-1">
            <label htmlFor="new-item" className="sr-only">Adicionar ingrediente</label>
            <input id="new-item" className={inputCls} placeholder="Adicionar ingrediente" value={newName} maxLength={LIMITS.text}
              aria-invalid={!!addError} aria-describedby={addError ? 'new-item-err' : undefined}
              onChange={(e) => { setNewName(e.target.value); setAddError(null) }} disabled={loading} />
            {addError && <p id="new-item-err" className="mt-1 text-sm font-semibold text-tomato">{addError}</p>}
          </div>
          <Button type="submit" variant="secondary" icon="plus" full={false} disabled={loading}>Adicionar</Button>
        </form>
      </Card>

      <Card as="section" className="space-y-3">
        <div>
          <h3 className="text-lg font-bold">Seu objetivo <span className="font-normal text-ink-muted">(opcional)</span></h3>
          <p className="text-sm text-ink-muted">
            O agente também lê o seu texto, mas só o que você preencher aqui entra como dado estruturado — por exemplo,
            o orçamento usado para comparar com o custo dos produtos.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {field('objetivo', 'Objetivo', { placeholder: 'ex.: jantar' })}
          {field('pessoas', 'Pessoas', { inputMode: 'numeric', placeholder: 'ex.: 2' })}
          {field('tempo', 'Tempo disponível (minutos)', { inputMode: 'numeric', placeholder: 'ex.: 30' })}
          {field('orcamento', 'Orçamento (R$)', { inputMode: 'decimal', placeholder: 'ex.: 35,00' })}
        </div>
      </Card>

      {loading && <Loading label="Planejando refeições…" detail="O agente está considerando seus ingredientes, objetivo e preferências." />}
      {error && !loading && <Notice tone="danger" role="alert" title="Não deu para gerar sugestões">{error.message}</Notice>}

      <Button icon="check" onClick={onConfirm} disabled={invalid} loading={loading}>
        {nextIsTags ? 'Confirmar ingredientes' : 'Confirmar e ver sugestões'}
      </Button>
      {items.length === 0 && <p className="text-center text-sm text-ink-muted">Adicione pelo menos um ingrediente para continuar.</p>}
    </div>
  )
}
