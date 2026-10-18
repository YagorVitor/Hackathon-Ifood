import { t } from './accessibility/i18n'
import { useAccessibility } from './accessibility/settings'
import { AccessibilityMenu } from './components/AccessibilityMenu'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, api } from './api'
import { Icon } from './components/icons'
import { Button, Notice, PROVENANCE, Badge, focusRing } from './components/ui'
import { LIMITS, buildContext, emptyFields, emptyTags, fromRecognized, parseNumber, fromRecognizedContext } from './flow'
import type { DeclaredFields, DraftItem } from './flow'
import type { AgentResponse, DeclaredTags, Location, McpTool, MealOption, OptionalComplement, SelectedProduct, UserContext } from './types'
import { photoDataUrl } from './components/PhotoInput'
import { IfoodConnection } from './components/IfoodConnection'
import { useUserProfile } from './hooks/useUserProfile'
import { useIfoodConnection } from './hooks/useIfoodConnection'
import type { AuthState } from './hooks/useIfoodConnection'
import { CaptureStep } from './steps/CaptureStep'
import { CartStep } from './steps/CartStep'
import { DeliveryAddressPicker, useDeliveryAddress } from './components/DeliveryAddressPicker'
import { DoneStep } from './steps/DoneStep'
import { MarketStep } from './steps/MarketStep'
import { OptionsStep } from './steps/OptionsStep'
import { ReviewStep } from './steps/ReviewStep'
import { TagsStep } from './steps/TagsStep'

// Sequência de docs/HACKATHON_CONTEXT.md §10: contar → conferir → (perfil, se o agente perguntar) → sugestões → Mercado → carrinho.
type Stage = 'capture' | 'review' | 'tags' | 'options' | 'market' | 'cart' | 'done'
type Busy = null | 'capture' | 'plan' | 'market'

const STEPS = ['Sua despensa', 'Sugestões do agente', 'Só o que falta', 'Carrinho'] as const
const STEP_OF: Record<Stage, number> = { capture: 0, review: 0, tags: 0, options: 1, market: 2, cart: 3, done: 2 }

const asApiError = (e: unknown) => (e instanceof ApiError ? e : new ApiError('failed', 'Erro inesperado. Tente novamente.'))

export default function App() {
  useAccessibility(true)
  const [stage, setStage] = useState<Stage>('capture')
  const [text, setText] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [captureMessage, setCaptureMessage] = useState('')
  const [items, setItems] = useState<DraftItem[]>([])
  const [fields, setFields] = useState<DeclaredFields>(emptyFields)
  const profile = useUserProfile()
  const { tags, consent } = profile
  const profileReturn = useRef<Stage>('capture')
  const [tagsMode, setTagsMode] = useState<'question' | 'edit'>('question')
  const [plan, setPlan] = useState<AgentResponse | null>(null)
  const [chosen, setChosen] = useState<MealOption | null>(null)
  const [market, setMarket] = useState<AgentResponse | null>(null)
  const [cartProducts, setCartProducts] = useState<SelectedProduct[]>([])
  const [location, setLocation] = useState<Location | null>(null)
  const [busy, setBusy] = useState<Busy>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [backend, setBackend] = useState<'checking' | 'up' | 'down'>('checking')
  const { auth, setAuth, waitingForLogin, connect, refreshAuth } = useIfoodConnection()
  const [tools, setTools] = useState<McpTool[] | null>(null)
  const delivery = useDeliveryAddress(auth === 'yes' && (stage === 'market' || stage === 'cart'))
  const address = delivery.selected
  const searchLocation = address?.latitude != null && address.longitude != null
    ? { latitude: address.latitude, longitude: address.longitude } : location
  const autoSearchAttempted = useRef(false)
  const searchGeneration = useRef(0)
  const destinationKey = `${address?.id ?? 'consulta'}:${searchLocation?.latitude ?? ''}:${searchLocation?.longitude ?? ''}`
  useEffect(() => {
    searchGeneration.current += 1
    autoSearchAttempted.current = false
    setMarket(null)
    setCartProducts([])
  }, [destinationKey])

  const invalidateSearch = () => {
    setError(null)
    searchGeneration.current += 1
    autoSearchAttempted.current = false
    setMarket(null)
    setCartProducts([])
    setLocation(null)
  }

  const go = (s: Stage) => { setError(null); setStage(s) }

  const checkBackend = useCallback(() => {
    setBackend('checking')
    api.health().then(() => setBackend('up')).catch(() => setBackend('down'))
  }, [])

  useEffect(() => { checkBackend() }, [checkBackend])

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
  }, [setAuth])

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
    if (res.data.pergunta_tags && tags.estado === 'NOT_ASKED') profile.save({ ...tags, estado: 'ASKED' }, consent, profile.remember)
    go('review')
  }

  async function runPlan(t: DeclaredTags = tags, c: boolean = consent, request?: string) {
    const res = await send('plan', request || text.trim() || 'Sugira refeições com os ingredientes que confirmei na revisão da foto.', buildContext({ items, fields, tags: t, consent: c, location: null }))
    if (!res) return
    setPlan(res)
    setChosen(null)
    setMarket(null)
    if (res.data.pergunta_tags && t.estado === 'NOT_ASKED') {
      profile.save({ ...t, estado: 'ASKED' }, c, profile.remember)
      setTagsMode('question')
      go('tags')
      return
    }
    go('options')
  }

  function confirmReview() {
    const t: DeclaredTags = { ...tags, estado: 'ANSWERED' }
    profile.save(t, consent, profile.remember)
    void runPlan(t, consent)
  }

  function openProfile() {
    profileReturn.current = stage === 'tags' ? profileReturn.current : stage
    setTagsMode('edit')
    go('tags')
  }

  function submitTags(t: DeclaredTags, c: boolean, remember: boolean) {
    profile.save(t, c, remember)
    invalidateSearch()
    setPlan(null)
    setChosen(null)
    if (tagsMode === 'question' || ['options', 'market', 'cart', 'done'].includes(profileReturn.current)) void runPlan(t, c)
    else go(profileReturn.current)
  }

  function forgetProfile() {
    profile.forget()
    invalidateSearch()
    setPlan(null)
    setChosen(null)
    setCaptureMessage('')
    go(items.length ? 'review' : 'capture')
  }

  function declineTags() {
    const t = emptyTags('DECLINED')
    profile.save(t, false, profile.remember)
    setPlan(null)
    void runPlan(t, false)
  }

  function chooseComplement(complement: OptionalComplement) {
    const parent = chosen?.titulo ?? 'sua refeição'
    invalidateSearch()
    choose({ titulo: `Complemento opcional: ${complement.nome}`, estrategia: 'CONVENIENCE',
      usa: [], faltantes: [complement.nome], justificativa: `${complement.justificativa} Opcional para acompanhar ${parent}.`,
      complementos_opcionais: [], provenance: 'INFERRED' })
  }

  function exploreComplements() {
    if (!chosen) return
    const request = `A refeição escolhida é ${JSON.stringify(chosen)}. Quero avaliar um acompanhamento OPCIONAL no iFood, sem mudar ou invalidar a refeição. Sugira até três opções CONVENIENCE de complementos genéricos compatíveis com meu perfil autorizado. Não busque produtos ainda: vou escolher. Não recompre itens do inventário.`
    go('options')
    void runPlan(tags, consent, request)
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
    if (!chosen || !searchLocation) return
    const generation = ++searchGeneration.current
    setMarket(null)
    const message = `Escolhi esta opção: ${JSON.stringify(chosen)}. Mantenha essa refeição como única opção e busque no iFood o que falta para ela. Use Mercado para ingredientes; para conveniência, considere restaurantes ou o catálogo geral conforme o pedido. Consulte parceiros abertos. Se não houver resultado adequado, informe a limitação sem trocar a opção escolhida.`
    const res = await send('market', message, buildContext({ items, fields, tags, consent, location: searchLocation }))
    if (res && generation === searchGeneration.current) setMarket(res)
  }, [chosen, searchLocation?.latitude, searchLocation?.longitude, items, fields, tags, consent, send])

  // Escolher a opção já autoriza a busca. Conexão e localização só suspendem sua execução.
  useEffect(() => {
    if (stage !== 'market' || auth !== 'yes' || !searchLocation || !chosen || market || busy || autoSearchAttempted.current) return
    autoSearchAttempted.current = true
    void consultMarket()
  }, [stage, auth, searchLocation, chosen, market, busy, consultMarket])

  function restart() {
    setText('')
    setPhoto(null)
    setCaptureMessage('')
    setItems([])
    setFields(emptyFields)
    setPlan(null)
    setChosen(null)
    setMarket(null)
    setCartProducts([])
    go('capture')
  }

  const orc = parseNumber(fields.orcamento)
  const budgetCents = orc === null || Number.isNaN(orc) ? null : Math.round(orc * 100)

  return (
    <div className="app-shell">
      <a href="#conteudo" className={`skip-link ${focusRing}`}>{t("Pular para o conteúdo")}</a>
      <header className="site-header">
        <div className="header-inner">
          <a href="/" className={`brand ${focusRing}`} aria-label={t("Despensa Reversa — início")}>
            <span className="brand-symbol"><Icon name="bowl" className="size-7" /></span>
            <span>despensa<span className="brand-second">reversa<span className="brand-dot">.</span></span></span>
          </a>
          <div className="header-links">
            <span className="header-section"><Icon name="jar" className="size-4" />{t(" Minha despensa")}</span>
            <a href="#como-funciona" className={`help-link ${focusRing}`}>{t("Como funciona")}</a>
          </div>
          <button type="button" className={`help-link profile-trigger inline-flex min-h-11 items-center gap-1 ${focusRing}`} onClick={openProfile} disabled={busy !== null}>
            <Icon name="leaf" className="size-4" />{t("Meu perfil")}{profile.remember ? t(' · salvo') : ''}
          </button>
          <AccessibilityMenu />
          <ConnectionPill auth={auth} backend={backend} onConnect={connect} />
        </div>
      </header>

      <p role="status" className="sr-only">{busy ? t("Processando seu pedido. Aguarde.") : ""}</p>
      <div className="page-container">
        <nav aria-label={t("Progresso")} className="progress-nav">
          <ol>
            {STEPS.map((label, i) => {
              const current = STEP_OF[stage] === i
              const done = STEP_OF[stage] > i
              return (
                <li key={t(label)} aria-current={current ? 'step' : undefined} className={current ? 'is-current' : done ? 'is-done' : ''}>
                  <span className="step-number">{done ? <Icon name="check" className="size-4" /> : i + 1}</span>
                  <span>{t(label)}</span>
                </li>
              )
            })}
          </ol>
        </nav>

        {backend === 'down' && (
          <div className="mb-6">
            <Notice tone="danger" role="alert" title={t("Não foi possível conectar ao serviço")}>
              <p>{t("Suas informações continuam nesta tela. Tente reconectar para analisar os ingredientes.")}</p>
              <div className="pt-2"><Button variant="secondary" icon="refresh" full={false} onClick={() => { checkBackend(); refreshAuth() }}>{t("Tentar reconectar")}</Button></div>
            </Notice>
          </div>
        )}

        <div className={`workspace ${stage === 'capture' ? 'workspace-capture' : ''}`}>
          <main tabIndex={-1} aria-busy={busy !== null} id="conteudo" className={`stage-content stage-${stage}`}>
        {profile.storageError && <Notice tone="warn" role="alert">{profile.storageError}</Notice>}
        {stage === 'capture' && (
          <CaptureStep text={text} onText={setText} photo={photo} onPhoto={setPhoto} onSubmit={capture} loading={busy === 'capture'} error={error}
            connection={<IfoodConnection auth={auth} waiting={waitingForLogin} disabled={backend !== 'up'} onConnect={connect} onRecheck={refreshAuth} />} />
        )}
        {stage === 'review' && (
          <ReviewStep
            photoBased={!!photo} text={text || t("Ingredientes enviados por fotografia.")} agentMessage={captureMessage} items={items} onItems={setItems} fields={fields} onFields={setFields}
            onConfirm={confirmReview} onEditText={() => go('capture')} loading={busy === 'plan'} error={error}
            onProfile={openProfile}
          />
        )}
        {stage === 'tags' && (
          <TagsStep
            key={tagsMode} mode={tagsMode} tags={tags} consent={consent} onSubmit={submitTags} onDecline={declineTags}
            remember={profile.remember} onForget={forgetProfile} storageError={profile.storageError}
            onCancel={() => go(profileReturn.current)} loading={busy === 'plan'} error={error}
          />
        )}
        {stage === 'options' && plan && (
          <OptionsStep
            message={plan.data.mensagem} options={plan.data.opcoes} limitations={plan.data.limitacoes}
            onChoose={choose} onEditItems={() => go('review')} onEditTags={openProfile}
            onRetry={() => void runPlan()} loading={busy === 'plan'} error={error}
          />
        )}
        {stage === 'market' && chosen && (
          <MarketStep
            option={chosen} auth={auth} onConnect={connect} onRecheck={refreshAuth}
            location={searchLocation} onLocation={(next) => { invalidateSearch(); setLocation(next) }} onConsult={consultMarket} result={market} budgetCents={budgetCents}
            cartEnabled={!!address && address.latitude !== null && address.longitude !== null}
            addressPicker={<DeliveryAddressPicker state={delivery.state} selected={address} disabled={busy !== null}
              onReconnect={connect}
              onSelect={(id) => { invalidateSearch(); delivery.select(id) }} onReload={() => { invalidateSearch(); delivery.reload() }} />}
            tools={tools} loading={busy === 'market'} error={error} onBack={() => go('options')} onRestart={restart}
            onComplement={chooseComplement} onExploreComplements={exploreComplements}
            onCart={(products) => { setCartProducts(products); go('cart') }}
            onConvenience={() => { go('options'); void runPlan(tags, consent, `Não encontrei complementos adequados para a opção escolhida: ${JSON.stringify(chosen)}. Sugira até três alternativas CONVENIENCE de refeições ou acompanhamentos prontos no iFood que atendam meu objetivo, preferências e restrições. Não faça buscas ainda; vou escolher uma alternativa. Pedido original: ${text}`) }}
          />
        )}
        {stage === 'cart' && chosen && cartProducts.length > 0 && address && (
          <CartStep
            option={chosen} products={cartProducts} address={address}
            onChangeAddress={() => { invalidateSearch(); delivery.select(null); go('market') }}
            onBack={() => go('market')} onRestart={restart}
          />
        )}
        {stage === 'done' && chosen && <DoneStep option={chosen} onComplement={chooseComplement} onExplore={exploreComplements} onBack={() => go('options')} onRestart={restart} />}
          </main>
          <aside className="context-sidebar" aria-label={t("Resumo da sua despensa")}>
            <div className="sidebar-card">
              <span className="sidebar-icon"><Icon name="jar" className="size-6" /></span>
              <h2>{t("Sua despensa, primeiro.")}</h2>
              <p>{t("A melhor compra começa pelo que você já tem.")}</p>
              {items.length > 0 && stage !== 'capture' ? (
                <>
                  <div className="sidebar-divider" />
                  <p className="sidebar-label">{stage === 'review' ? t("PARA VOCÊ CONFERIR") : t("SEUS INGREDIENTES")}</p>
                  <ul className="pantry-chips">{items.map((item) => <li key={item.key}><Icon name={stage === 'review' ? 'jar' : 'check'} className="size-3.5" />{item.nome}</li>)}</ul>
                  <dl className="context-facts">
                    {fields.objetivo && <div><dt>{t("Objetivo")}</dt><dd>{fields.objetivo}</dd></div>}
                    {fields.pessoas && <div><dt>{t("Pessoas")}</dt><dd>{fields.pessoas}</dd></div>}
                    {fields.tempo && <div><dt>{t("Tempo")}</dt><dd>{fields.tempo} min</dd></div>}
                    {budgetCents !== null && <div><dt>{t("Orçamento")}</dt><dd>{(budgetCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</dd></div>}
                  </dl>
                </>
              ) : (
                <ol className="sidebar-how">
                  <li><span>01</span><div><b>{t("Conte o que tem")}</b><p>{t("Ingredientes e o que você quer preparar.")}</p></div></li>
                  <li><span>02</span><div><b>{t("Encontre uma ideia")}</b><p>{t("Confira os itens e escolha uma sugestão.")}</p></div></li>
                  <li><span>03</span><div><b>{t("Complete se precisar")}</b><p>{t("Busque só o que falta e monte o carrinho no iFood.")}</p></div></li>
                </ol>
              )}
              <div className="sidebar-bottom"><Icon name="leaf" className="size-4" /><span>{t("Mais aproveitamento.")}<br />{t("Compras com mais sentido.")}</span></div>
            </div>
            <div className="privacy-note"><Icon name="shield" className="size-4" /><p>{t("Você decide o que compartilhar. Preferências e restrições são opcionais.")}</p></div>
          </aside>
        </div>

        <footer id="como-funciona" className="site-footer">
          <div className="footer-intro"><Icon name="bowl" className="size-5" /><span>Despensa Reversa</span><span className="footer-caption">{t("Da sua despensa à próxima refeição.")}</span></div>
          <details>
            <summary className={`cursor-pointer ${focusRing}`}>{t("Como funciona e de onde vêm os dados?")}</summary>
            <p className="mt-3">{t("Conte o que tem, confira o que o agente entendeu e escolha uma sugestão. Se precisar completar a refeição, o agente busca ingredientes no Mercado ou opções prontas no iFood com a localização que você autorizar, e você pode montar o carrinho com eles.")}</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {(Object.keys(PROVENANCE) as (keyof typeof PROVENANCE)[]).map((p) => (
                <li key={p} className="space-y-1"><Badge p={p} /><p>{t(PROVENANCE[p].hint)}</p></li>
              ))}
            </ul>
            <p className="mt-4">{t("O carrinho só é criado na sua conta iFood depois que você revisa e confirma. Entrega, pagamento e envio do pedido não são executados nesta versão. A abertura no app depende do link devolvido pelo MCP.")}</p>
          </details>
        </footer>
      </div>
    </div>
  )
}

function ConnectionPill({ auth, backend, onConnect }: { auth: AuthState; backend: 'checking' | 'up' | 'down'; onConnect: () => void }) {
  const [label, cls] =
    backend === 'down' ? ['Backend fora do ar', 'bg-tomato-soft text-tomato']
      : auth === 'yes' ? ['iFood conectado', 'bg-herb-soft text-herb']
        : auth === 'no' ? ['Conectar conta iFood', 'bg-surface-2 text-ink-muted']
          : auth === 'error' ? ['Status indisponível', 'bg-surface-2 text-ink-muted']
            : ['Verificando…', 'bg-surface-2 text-ink-muted']
  if (backend === 'up' && (auth === 'no' || auth === 'error')) return (
    <button type="button" onClick={onConnect} className={`connection-pill inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold ${cls} ${focusRing}`}>
      <Icon name="plug" className="size-4" />{t("Conectar conta iFood ")}</button>
  )
  return (
    <p role="status" className={`connection-pill inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold ${cls}`}>
      <Icon name="plug" className="size-4" />{t(label)}
    </p>
  )
}
