import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, api } from './api'
import { Icon } from './components/icons'
import { Button, Notice, PROVENANCE, Badge, focusRing } from './components/ui'
import { LIMITS, buildContext, emptyFields, emptyTags, fromRecognized, parseNumber, fromRecognizedContext } from './flow'
import type { DeclaredFields, DraftItem } from './flow'
import type { AgentResponse, DeclaredTags, Location, McpTool, MealOption, UserContext } from './types'
import { photoDataUrl } from './components/PhotoInput'
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

const STEPS = ['Sua despensa', 'Sugestões do agente', 'Só o que falta'] as const
const STEP_OF: Record<Stage, number> = { capture: 0, review: 0, tags: 0, options: 1, market: 2, done: 2 }

const asApiError = (e: unknown) => (e instanceof ApiError ? e : new ApiError('failed', 'Erro inesperado. Tente novamente.'))

export default function App() {
  const [stage, setStage] = useState<Stage>('capture')
  const [text, setText] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
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
  const autoSearchAttempted = useRef(false)

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

  const send = useCallback(async (kind: Exclude<Busy, null>, message: string, context: UserContext) => {
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
  }, [])

  async function capture() {
    let res: AgentResponse | null = null
    if (photo) {
      setBusy('capture')
      setError(null)
      try {
        res = await api.parseImage(await photoDataUrl(photo), text)
      } catch (e) {
        setError(asApiError(e))
      } finally {
        setBusy(null)
      }
    } else {
      res = await send('capture', `Organize os ingredientes e os detalhes do pedido abaixo para eu conferir. Ainda não planeje refeições nem busque produtos. Pedido: ${text}`, buildContext({ items: [], fields: emptyFields, tags, consent, location: null }))
    }
    if (!res) return
    setItems(fromRecognized(res.data.ingredientes_reconhecidos))
    setFields(fromRecognizedContext(res.data.contexto_reconhecido))
    setCaptureMessage(res.data.mensagem)
    // Opções geradas antes da confirmação partem de um inventário vazio; não são exibidas.
    setPlan(null)
    if (res.data.pergunta_tags) setTags((t) => ({ ...t, estado: 'ASKED' }))
    go('review')
  }

  async function runPlan(t: DeclaredTags = tags, c: boolean = consent) {
    const res = await send('plan', text.trim() || 'Sugira refeições com os ingredientes que confirmei na revisão da foto.', buildContext({ items, fields, tags: t, consent: c, location: null }))
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
    const t: DeclaredTags = { ...tags, estado: 'ANSWERED' }
    setTags(t)
    void runPlan(t, consent)
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
    autoSearchAttempted.current = false
    setChosen(o)
    setMarket(null)
    if (o.faltantes.length === 0) {
      go('done')
    } else {
      go('market')
      refreshAuth()
    }
  }

  const consultMarket = useCallback(async () => {
    if (!chosen || !location) return
    setMarket(null)
    const message = `Escolhi esta opção: ${JSON.stringify(chosen)}. Mantenha essa refeição como única opção e busque no iFood Mercado apenas os ingredientes faltantes dela.`
    const res = await send('market', message, buildContext({ items, fields, tags, consent, location }))
    if (res) setMarket(res)
  }, [chosen, location, items, fields, tags, consent, send])

  // Escolher a opção já autoriza a busca. Conexão e localização só suspendem sua execução.
  useEffect(() => {
    if (stage !== 'market' || auth !== 'yes' || !location || !chosen || market || busy || autoSearchAttempted.current) return
    autoSearchAttempted.current = true
    void consultMarket()
  }, [stage, auth, location, chosen, market, busy, consultMarket])

  function restart() {
    setText('')
    setPhoto(null)
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
    <div className="app-shell">
      <a href="#conteudo" className={`skip-link ${focusRing}`}>Pular para o conteúdo</a>
      <header className="site-header">
        <div className="header-inner">
          <a href="/" className={`brand ${focusRing}`} aria-label="Despensa Reversa — início">
            <span className="brand-symbol"><Icon name="bowl" className="size-7" /></span>
            <span>despensa<span className="brand-second">reversa<span className="brand-dot">.</span></span></span>
          </a>
          <div className="header-links">
            <span className="header-section"><Icon name="jar" className="size-4" /> Minha despensa</span>
            <a href="#como-funciona" className={`help-link ${focusRing}`}>Como funciona</a>
          </div>
          <ConnectionPill auth={auth} backend={backend} />
        </div>
      </header>

      <div className="page-container">
        <nav aria-label="Progresso" className="progress-nav">
          <ol>
            {STEPS.map((label, i) => {
              const current = STEP_OF[stage] === i
              const done = STEP_OF[stage] > i
              return (
                <li key={label} aria-current={current ? 'step' : undefined} className={current ? 'is-current' : done ? 'is-done' : ''}>
                  <span className="step-number">{done ? <Icon name="check" className="size-4" /> : i + 1}</span>
                  <span>{label}</span>
                </li>
              )
            })}
          </ol>
        </nav>

        {backend === 'down' && (
          <div className="mb-6">
            <Notice tone="danger" role="alert" title="Não foi possível conectar ao serviço">
              <p>Suas informações continuam nesta tela. Tente reconectar para analisar os ingredientes.</p>
              <div className="pt-2"><Button variant="secondary" icon="refresh" full={false} onClick={() => { checkBackend(); refreshAuth() }}>Tentar reconectar</Button></div>
            </Notice>
          </div>
        )}

        <div className={`workspace ${stage === 'capture' ? 'workspace-capture' : ''}`}>
          <main id="conteudo" className={`stage-content stage-${stage}`}>
        {stage === 'capture' && (
          <CaptureStep text={text} onText={setText} photo={photo} onPhoto={setPhoto} onSubmit={capture} loading={busy === 'capture'} error={error} />
        )}
        {stage === 'review' && (
          <ReviewStep
            photoBased={!!photo} text={text || 'Ingredientes enviados por fotografia.'} agentMessage={captureMessage} items={items} onItems={setItems} fields={fields} onFields={setFields}
            onConfirm={confirmReview} onEditText={() => go('capture')} loading={busy === 'plan'} error={error}
            tags={tags} onTags={setTags} consent={consent} onConsent={setConsent}
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
            location={location} onLocation={(next) => { autoSearchAttempted.current = false; setLocation(next) }} onConsult={consultMarket} result={market} budgetCents={budgetCents}
            tools={tools} loading={busy === 'market'} error={error} onBack={() => go('options')} onRestart={restart}
          />
        )}
        {stage === 'done' && chosen && <DoneStep option={chosen} onBack={() => go('options')} onRestart={restart} />}
          </main>
          <aside className="context-sidebar" aria-label="Resumo da sua despensa">
            <div className="sidebar-card">
              <span className="sidebar-icon"><Icon name="jar" className="size-6" /></span>
              <h2>Sua despensa, primeiro.</h2>
              <p>A melhor compra começa pelo que você já tem.</p>
              {items.length > 0 && stage !== 'capture' ? (
                <>
                  <div className="sidebar-divider" />
                  <p className="sidebar-label">{stage === 'review' ? 'PARA VOCÊ CONFERIR' : 'SEUS INGREDIENTES'}</p>
                  <ul className="pantry-chips">{items.map((item) => <li key={item.key}><Icon name={stage === 'review' ? 'jar' : 'check'} className="size-3.5" />{item.nome}</li>)}</ul>
                  <dl className="context-facts">
                    {fields.objetivo && <div><dt>Objetivo</dt><dd>{fields.objetivo}</dd></div>}
                    {fields.pessoas && <div><dt>Pessoas</dt><dd>{fields.pessoas}</dd></div>}
                    {fields.tempo && <div><dt>Tempo</dt><dd>{fields.tempo} min</dd></div>}
                    {budgetCents !== null && <div><dt>Orçamento</dt><dd>{(budgetCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</dd></div>}
                  </dl>
                </>
              ) : (
                <ol className="sidebar-how">
                  <li><span>01</span><div><b>Conte o que tem</b><p>Ingredientes e o que você quer preparar.</p></div></li>
                  <li><span>02</span><div><b>Encontre uma ideia</b><p>Confira os itens e escolha uma sugestão.</p></div></li>
                  <li><span>03</span><div><b>Complete se precisar</b><p>Busque só o que falta no iFood Mercado.</p></div></li>
                </ol>
              )}
              <div className="sidebar-bottom"><Icon name="leaf" className="size-4" /><span>Mais aproveitamento.<br />Compras com mais sentido.</span></div>
            </div>
            <div className="privacy-note"><Icon name="shield" className="size-4" /><p>Você decide o que compartilhar. Preferências e restrições são opcionais.</p></div>
          </aside>
        </div>

        <footer id="como-funciona" className="site-footer">
          <div className="footer-intro"><Icon name="bowl" className="size-5" /><span>Despensa Reversa</span><span className="footer-caption">Da sua despensa à próxima refeição.</span></div>
          <details>
            <summary className={`cursor-pointer ${focusRing}`}>Como funciona e de onde vêm os dados?</summary>
            <p className="mt-3">Conte o que tem, confira o que o agente entendeu e escolha uma sugestão. Se precisar completar a refeição, o agente busca os faltantes no iFood Mercado com a localização que você autorizar.</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {(Object.keys(PROVENANCE) as (keyof typeof PROVENANCE)[]).map((p) => (
                <li key={p} className="space-y-1"><Badge p={p} /><p>{PROVENANCE[p].hint}</p></li>
              ))}
            </ul>
            <p className="mt-4">Nesta versão, a consulta ao Mercado ajuda a montar sua lista. Carrinho e pedidos ainda não estão disponíveis.</p>
          </details>
        </footer>
      </div>
    </div>
  )
}

function ConnectionPill({ auth, backend }: { auth: AuthState; backend: 'checking' | 'up' | 'down' }) {
  const [label, cls] =
    backend === 'down' ? ['Backend fora do ar', 'bg-tomato-soft text-tomato']
      : auth === 'yes' ? ['iFood conectado', 'bg-herb-soft text-herb']
        : auth === 'no' ? ['Conecte ao buscar no Mercado', 'bg-surface-2 text-ink-muted']
          : auth === 'error' ? ['Status indisponível', 'bg-surface-2 text-ink-muted']
            : ['Verificando…', 'bg-surface-2 text-ink-muted']
  return (
    <p role="status" className={`connection-pill inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold ${cls}`}>
      <Icon name="plug" className="size-4" />{label}
    </p>
  )
}
