import type { ApiError } from '../api'
import { Button, Card, Loading, Notice, StageTitle, focusRing, inputCls } from '../components/ui'
import { EXAMPLE_TEXT, LIMITS } from '../flow'

export function CaptureStep({ text, onText, onSubmit, loading, error }: {
  text: string
  onText: (v: string) => void
  onSubmit: () => void
  loading: boolean
  error: ApiError | null
}) {
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => { e.preventDefault(); if (text.trim() && !loading) onSubmit() }}
    >
      <StageTitle kicker="Etapa 1 de 4">O que você já tem em casa?</StageTitle>
      <p className="text-ink-muted">
        Antes de pensar no que comprar, a Despensa Reversa entende o que você já tem. Conte com suas palavras —
        ingredientes, para quantas pessoas, quanto tempo e quanto quer gastar.
      </p>

      <Card>
        <label htmlFor="context-text" className="mb-2 block font-bold">Sua despensa e seu objetivo</label>
        <textarea
          id="context-text"
          rows={6}
          maxLength={LIMITS.message}
          aria-describedby="context-help context-count"
          className={`${inputCls} min-h-36 resize-y`}
          placeholder="Ex.: Tenho arroz, ovos e tomate. Quero um jantar rápido para duas pessoas…"
          value={text}
          onChange={(e) => onText(e.target.value)}
          disabled={loading}
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
          <button
            type="button"
            className={`min-h-11 cursor-pointer rounded-lg px-1 font-bold text-herb underline underline-offset-4 ${focusRing}`}
            onClick={() => onText(EXAMPLE_TEXT)}
            disabled={loading}
          >
            Usar o exemplo da demonstração
          </button>
          <span id="context-count" className="tabular-nums text-ink-muted">
            {text.length}/{LIMITS.message}
          </span>
        </div>
        <p id="context-help" className="mt-2 text-sm text-ink-muted">
          O texto vai para o agente de IA só para esta análise e não fica guardado pelo app depois da resposta.
          A entrada por foto ainda não está disponível nesta versão.
        </p>
      </Card>

      {loading && <Loading label="Lendo o que você tem…" detail="O agente está identificando os ingredientes. Pode levar alguns segundos." />}
      {error && !loading && <Notice tone="danger" role="alert" title="Não deu para analisar o texto">{error.message}</Notice>}

      <Button type="submit" icon="search" disabled={!text.trim()} loading={loading}>
        {loading ? 'Analisando…' : 'Reconhecer ingredientes'}
      </Button>
    </form>
  )
}
