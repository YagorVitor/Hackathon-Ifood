import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, api } from './api'
import { Icon } from './components/icons'
import { Button, Notice, PROVENANCE, Badge, focusRing } from './components/ui'
import { LIMITS, buildContext, emptyFields, emptyTags, fromRecognized, parseNumber } from './flow'
import type { DeclaredFields, DraftItem } from './flow'
import type { AgentResponse, DeclaredTags, Location, McpTool, MealOption, UserContext } from './types'
import { CaptureStep } from './steps/CaptureStep'
import { DoneStep } from './steps/DoneStep'
import { MarketStep } from './steps/MarketStep'
import type { AuthState } from './steps/MarketStep'
import { OptionsStep } from './steps/OptionsStep'
import { ReviewStep } from './steps/ReviewStep'
import { TagsStep } from './steps/TagsStep'

// Sequência de docs/HACKATHON_CONTEXT.md §10: contar → conferir → (perfil, se o agente perguntar) → sugestões → Mercado.
type Stage = 'capture' | 'review' | 'tags' | 'options' | 'market' | 'done'
type Busy = null | 'capture' | 'plan' | 'market'

const STEPS = ['Contar', 'Conferir', 'Sugestões', 'Mercado'] as const
const STEP_OF: Record<Stage, number> = { capture: 0, review: 1, tags: 1, options: 2, market: 3, done: 3 }

const asApiError = (e: unknown) => (e instanceof ApiError ? e : new ApiError('failed', 'Erro inesperado. Tente novamente.'))

export default function App() {
  const [stage, setStage] = useState<Stage>('capture')
  const [text, setText] = useState('')
  const [captureMessage, setCaptureMessage] = useState('')
  const [items, setItems] = useState<DraftItem[]>([])
  const [fields, setFields] = useState<DeclaredFields>(emptyFields)
  // Perfil só em memória desta aba: nada vai para localStorage.
  const [tags, setTags] = useState<DeclaredTags>(emptyTags())
  const [consent, setConsent] = useState(false)
  const [tagsMode, setTagsMode] = useState<'question' | 'edit'>('question')
  const [plan, setPlan] = useState<AgentResponse | null>(null)
  const [chosen, setChosen] = useState<MealOption | null>(null)
  const [market, setMarket] = useState<AgentResponse | null>(null)
  const [location, setLocation] = useState<Location | null>(null)
  const [busy, setBusy] = useState<Busy>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [backend, setBackend] = useState<'checking' | 'up' | 'down'>('checking')
  const [auth, setAuth] = useState<AuthState>('checking')
  const [tools, setTools] = useState<McpTool[] | null>(null)

  const go = (s: Stage) => { setError(null); setStage(s) }

  const checkBackend = useCallback(() => {
    setBackend('checking')
    api.health().then(() => setBackend('up')).catch(() => setBackend('down'))
  }, [])

  const refreshAuth = useCallback(() => {
    setAuth('checking')
    api.authStatus()
      .then((r) => setAuth(r.authenticated ? 'yes' : 'no'))
      .catch(() => setAuth('error'))
  }, [])

  useEffect(() => { checkBackend(); refreshAuth() }, [checkBackend, refreshAuth])

  // O login iFood termina em outra aba (callback no backend); ao voltar, conferimos de novo.
  useEffect(() => {
    if (stage !== 'market' || auth === 'yes') return
    const onFocus = () => { if (document.visibilityState === 'visible') refreshAuth() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => { window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onFocus) }
  }, [stage, auth, refreshAuth])

  useEffect(() => {
    if (stage !== 'market' || auth !== 'yes' || tools !== null) return
    api.tools().then(setTools).catch(() => setTools([]))
  }, [stage, auth, tools])

  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return }
    window.scrollTo({ top: 0 })
    document.getElementById('stage-title')?.focus({ preventScroll: true })
  }, [stage, tagsMode])

  async function send(kind: Exclude<Busy, null>, message: string, context: UserContext) {
    setBusy(kind)
    setError(null)
    try {
      return await api.sendMessage({ message: message.slice(0, LIMITS.message), context, remember_context: false })
    } catch (e) {
      const err = asApiError(e)
      if (err.kind === 'auth') setAuth('no')
      if (err.kind === 'network') setBackend('down')
      setError(err)
      return null
    } finally {
      setBusy(null)
    }
  }

  async function capture() {
    // Etapa 1: só o texto. Inventário vazio e sem localização, para nada ser buscado antes da confirmação.
    const res = await send('capture', text, buildContext({ items: [], fields: emptyFields, tags, consent, location: null }))
    if (!res) return
    setItems(fromRecognized(res.data.ingredientes_reconhecidos))
    setCaptureMessage(res.data.mensagem)
    // Opções geradas antes da confirmação partem de um inventário vazio; não são exibidas.
    setPlan(null)
    if (res.data.pergunta_tags) setTags((t) => ({ ...t, estado: 'ASKED' }))
    go('review')
  }

  async function runPlan(t: DeclaredTags = tags, c: boolean = consent) {
    const res = await send('plan', text, buildContext({ items, fields, tags: t, consent: c, location: null }))
    if (!res) return
    setPlan(res)
    setChosen(null)
    setMarket(null)
    if (res.data.pergunta_tags && t.estado === 'NOT_ASKED') {
      setTags({ ...t, estado: 'ASKED' })
      setTagsMode('question')
      go('tags')
      return
    }
    go('options')
  }

  function confirmReview() {
    if (tags.estado === 'ASKED') {
      setTagsMode('question')
      go('tags')
    } else {
      void runPlan()
    }
  }

  function submitTags(t: DeclaredTags, c: boolean) {
    setTags(t)
    setConsent(c)
    void runPlan(t, c)
  }

  function declineTags() {
    const t = emptyTags('DECLINED')
    setTags(t)
    setConsent(false)
    // Se o agente já trouxe opções junto com a pergunta, elas valem para quem não quis informar.
    if (plan && plan.data.opcoes.length > 0) go('options')
    else void runPlan(t, false)
  }

  function choose(o: MealOption) {
    setChosen(o)
    setMarket(null)
    if (o.faltantes.length === 0) {
      go('done')
    } else {
      go('market')
      refreshAuth()
    }
  }

  async function consultMarket() {
    if (!chosen || !location) return
    setMarket(null)
    const message = `Escolhi a opção "${chosen.titulo}". Busque no iFood Mercado o que falta: ${chosen.faltantes.join(', ')}.`
    const res = await send('market', message, buildContext({ items, fields, tags, consent, location }))
    if (res) setMarket(res)
  }

  function restart() {
    setText('')
    setCaptureMessage('')
    setItems([])
    setFields(emptyFields)
    setPlan(null)
    setChosen(null)
    setMarket(null)
    go('capture')
  }

  const orc = parseNumber(fields.orcamento)
  const budgetCents = orc === null || Number.isNaN(orc) ? null : Math.round(orc * 100)

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <a href="#conteudo" className={`sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-20 focus:rounded-lg focus:bg-surface focus:p-3 ${focusRing}`}>
        Pular para o conteúdo
      </a>

      <header className="space-y-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-11 items-center justify-center rounded-xl bg-herb text-on-herb">
              <Icon name="jar" className="size-6" />
            </span>
            <div>
              <h1 className="text-xl font-bold leading-tight">Despensa Reversa</h1>
              <p className="text-sm text-ink-muted">Primeiro o que você tem. Depois, só o que falta.</p>
            </div>
          </div>
          <ConnectionPill auth={auth} backend={backend} />
        </div>

        <nav aria-label="Progresso">
          <ol className="grid grid-cols-4 gap-1.5">
            {STEPS.map((label, i) => {
              const current = STEP_OF[stage] === i
              const done = STEP_OF[stage] > i
              return (
                <li key={label} aria-current={current ? 'step' : undefined} className="space-y-1">
                  <div className={`h-1.5 rounded-full ${done || current ? 'bg-herb' : 'bg-line'}`} />
                  <p className={`text-xs font-bold sm:text-sm ${current ? 'text-ink' : 'text-ink-muted'}`}>
                    {label}<span className="sr-only">{current ? ' (etapa atual)' : done ? ' (concluída)' : ''}</span>
                  </p>
                </li>
              )
            })}
          </ol>
        </nav>
      </header>

      <main id="conteudo" className="flex-1 space-y-4">
        {backend === 'down' && (
          <Notice tone="danger" role="alert" title="Backend indisponível">
            <p>Inicie o backend em <code className="font-mono">localhost:8000</code> (veja o README do frontend) e tente de novo.</p>
            <div className="pt-1"><Button variant="secondary" icon="refresh" full={false} onClick={() => { checkBackend(); refreshAuth() }}>Tentar de novo</Button></div>
          </Notice>
        )}

        {stage === 'capture' && (
          <CaptureStep text={text} onText={setText} onSubmit={capture} loading={busy === 'capture'} error={error} />
        )}
        {stage === 'review' && (
          <ReviewStep
            text={text} agentMessage={captureMessage} items={items} onItems={setItems} fields={fields} onFields={setFields}
            onConfirm={confirmReview} onEditText={() => go('capture')} loading={busy === 'plan'} error={error}
            nextIsTags={tags.estado === 'ASKED'}
          />
        )}
        {stage === 'tags' && (
          <TagsStep
            key={tagsMode} mode={tagsMode} tags={tags} consent={consent} onSubmit={submitTags} onDecline={declineTags}
            onCancel={() => go('options')} loading={busy === 'plan'} error={error}
          />
        )}
        {stage === 'options' && plan && (
          <OptionsStep
            message={plan.data.mensagem} options={plan.data.opcoes} limitations={plan.data.limitacoes} tags={tags} consent={consent}
            onChoose={choose} onEditItems={() => go('review')} onEditTags={() => { setTagsMode('edit'); go('tags') }}
            onRetry={() => void runPlan()} loading={busy === 'plan'} error={error}
          />
        )}
        {stage === 'market' && chosen && (
          <MarketStep
            option={chosen} auth={auth} onConnect={() => window.open(api.loginUrl, '_blank', 'noopener')} onRecheck={refreshAuth}
            location={location} onLocation={setLocation} onConsult={consultMarket} result={market} budgetCents={budgetCents}
            tools={tools} loading={busy === 'market'} error={error} onBack={() => go('options')} onRestart={restart}
          />
        )}
        {stage === 'done' && chosen && <DoneStep option={chosen} onBack={() => go('options')} onRestart={restart} />}
      </main>

      <footer className="mt-8 space-y-3 border-t border-line pt-4 text-sm text-ink-muted">
        <details>
          <summary className={`cursor-pointer font-bold text-ink ${focusRing}`}>Como ler as etiquetas</summary>
          <ul className="mt-2 space-y-2">
            {(Object.keys(PROVENANCE) as (keyof typeof PROVENANCE)[]).map((p) => (
              <li key={p} className="flex flex-wrap items-center gap-2"><Badge p={p} /> {PROVENANCE[p].hint}</li>
            ))}
          </ul>
        </details>
        <p>Protótipo local. Este app não cria carrinho nem faz pedidos no iFood.</p>
      </footer>
    </div>
  )
}

function ConnectionPill({ auth, backend }: { auth: AuthState; backend: 'checking' | 'up' | 'down' }) {
  const [label, cls] =
    backend === 'down' ? ['Backend fora do ar', 'bg-tomato-soft text-tomato']
      : auth === 'yes' ? ['iFood conectado', 'bg-herb-soft text-herb']
        : auth === 'no' ? ['iFood não conectado', 'bg-surface-2 text-ink-muted']
          : auth === 'error' ? ['Status indisponível', 'bg-surface-2 text-ink-muted']
            : ['Verificando…', 'bg-surface-2 text-ink-muted']
  return (
    <p role="status" className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${cls}`}>
      <Icon name="plug" className="size-4" />{label}
    </p>
  )
}
