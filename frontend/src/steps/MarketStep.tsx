import { t } from '../accessibility/i18n'
import { useState } from 'react'
import type { ReactNode } from 'react'
import type { ApiError } from '../api'
import { Icon } from '../components/icons'
import { AgentNote, Badge, Button, Card, Loading, Notice, StageTitle, brl, focusRing, inputCls } from '../components/ui'
import { normalized, parseNumber } from '../flow'
import type { AgentResponse, CostSummary, Location, MealOption, SelectedProduct } from '../types'
import { IngredientLine, StrategyTag } from './OptionsStep'
import type { AuthState } from '../hooks/useIfoodConnection'

export function MarketStep({
  option, auth, onConnect, onRecheck, location, onLocation, onConsult, result, budgetCents, loading, error, onBack, onRestart, onCart, addressPicker, cartEnabled, onConvenience,
}: {
  option: MealOption
  auth: AuthState
  onConnect: () => void
  onRecheck: () => void
  location: Location | null
  onLocation: (l: Location | null) => void
  onConsult: () => void
  result: AgentResponse | null
  budgetCents: number | null
  loading: boolean
  error: ApiError | null
  onBack: () => void
  onRestart: () => void
  onCart: (products: SelectedProduct[]) => void
  addressPicker: ReactNode
  cartEnabled: boolean
  onConvenience: () => void
}) {
  const ready = auth === 'yes' && location !== null

  return (
    <div className="space-y-4">
      <StageTitle kicker={t("O agente busca no iFood")}>{option.estrategia === 'CONVENIENCE' ? t("Uma opção pronta para sua refeição.") : t("Só falta completar sua despensa.")}</StageTitle>
      <p className="text-ink-muted">{option.estrategia === 'CONVENIENCE' ? t("Vou buscar opções prontas no iFood, incluindo restaurantes, conforme a sua escolha.") : t("Vou buscar seus ingredientes no Mercado e ampliar a consulta no iFood se não encontrar opções adequadas.")}</p>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <StrategyTag s={option.estrategia} />
          <Badge p="INFERRED" label={t("Opção escolhida")} />
        </div>
        <h3 className="text-xl font-bold">{option.titulo}</h3>
        <IngredientLine label={t("Você já tem")} items={option.usa} tone="have" />
        <IngredientLine label={t("Vamos procurar")} items={option.faltantes} tone="missing" />
      </Card>

      {(
        <Card as="section" className="space-y-4">
          <h3 className="text-lg font-bold">{t("Tudo pronto para a busca?")}</h3>
          <p className="text-sm text-ink-muted">{t("Assim que a conta e a localização estiverem prontas, o agente inicia a busca automaticamente.")}</p>
          <ol className="space-y-4">
            <li className="space-y-2">
              <StepHead n={1} done={auth === 'yes'} title={t("Conta iFood")} />
              {auth === 'checking' && <p className="text-sm text-ink-muted" role="status">{t("Verificando conexão…")}</p>}
              {auth === 'yes' && <p className="text-sm font-semibold text-herb">{t("Conta conectada. A busca usa o MCP oficial do iFood.")}</p>}
              {auth === 'error' && <Notice tone="danger" role="alert">{t("Não foi possível verificar a conexão com o backend.")}</Notice>}
              {(auth === 'no' || auth === 'error') && (
                <div className="space-y-2">
                  <p className="text-sm text-ink-muted">{t("O login acontece no iFood, em uma nova aba. Depois volte para esta página.")}</p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button icon="external" onClick={onConnect}>{t("Conectar conta iFood")}</Button>
                    <Button variant="secondary" icon="refresh" onClick={onRecheck}>{t("Já conectei, verificar")}</Button>
                  </div>
                </div>
              )}
            </li>
            <li className="space-y-2">
              <StepHead n={2} done={cartEnabled} title={t("Endereço de entrega")} />
              {auth === 'yes' && addressPicker}
              {auth === 'yes' && !cartEnabled && <details className="rounded-xl border border-line p-3">
                <summary className={`cursor-pointer text-sm font-bold ${focusRing}`}>{t("Explorar por localização, sem criar carrinho")}</summary>
                <p className="my-2 text-sm text-ink-muted">{t("Isso permite consultar ofertas. Um carrinho exige endereço salvo e uma nova busca para esse destino.")}</p>
                <LocationPicker location={location} onLocation={onLocation} disabled={loading} />
              </details>}
            </li>
          </ol>
        </Card>
      )}


      {loading && <Loading label={t("Consultando o iFood…")} detail={t("O agente consulta parceiros abertos para o seu destino. Pode levar até um minuto.")} />}
      {error && !loading && (
        <Notice tone="danger" role="alert" title={error.kind === 'auth' ? t("Conexão com o iFood necessária") : t("A consulta não foi concluída")}>
          <p>{t(error.message)}</p>
          <p>{t("Nenhum produto foi confirmado e nenhuma compra foi feita.")}</p>
        </Notice>
      )}

      {result && !loading && <MarketResult result={result} budgetCents={budgetCents} onCart={onCart} cartEnabled={cartEnabled} />}

      {result && !loading && !error && option.estrategia !== 'CONVENIENCE' && result.data.produtos.length === 0 && result.data.buscas.some((b) => b.status === 'empty') && (
        <Card className="space-y-3">
          <h3 className="font-bold">{t("Podemos pensar em algo pronto.")}</h3>
          <p className="text-sm text-ink-muted">{t("A busca não confirmou os ingredientes necessários. O agente pode sugerir alternativas de restaurantes e outras opções do iFood, mantendo suas preferências.")}</p>
          <Button variant="secondary" icon="sparkle" onClick={onConvenience}>{t("Ver alternativas prontas no iFood")}</Button>
        </Card>
      )}

      {!loading && (
        <div className="space-y-2">
          {!result ? (
            <>
              {error && ready && <Button icon="refresh" onClick={onConsult}>{t("Tentar a busca novamente")}</Button>}
            </>
          ) : (
            <Button variant="secondary" icon="refresh" onClick={onConsult} disabled={!ready}>{t("Consultar de novo")}</Button>
          )}
          <Button variant="ghost" icon="back" onClick={onBack}>{t("Voltar às sugestões")}</Button>
          {result && <Button variant="ghost" icon="plus" onClick={onRestart}>{t("Começar uma nova consulta")}</Button>}
        </div>
      )}


    </div>
  )
}

function StepHead({ n, done, title }: { n: number; done: boolean; title: string }) {
  return (
    <p className="flex items-center gap-2 font-bold">
      <span className={`inline-flex size-7 items-center justify-center rounded-full text-sm ${done ? 'bg-herb text-on-herb' : 'bg-surface-2 text-ink'}`}>
        {done ? <Icon name="check" className="size-4" /> : n}
      </span>
      {t(title)}
      <span className="sr-only">{done ? '(pronto)' : '(pendente)'}</span>
    </p>
  )
}

function LocationPicker({ location, onLocation, disabled }: { location: Location | null; onLocation: (l: Location | null) => void; disabled: boolean }) {
  const [status, setStatus] = useState<'idle' | 'locating'>('idle')
  const [geoError, setGeoError] = useState<string | null>(null)
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [manualError, setManualError] = useState<string | null>(null)

  const locate = () => {
    if (!('geolocation' in navigator)) return setGeoError('Este navegador não oferece localização. Informe as coordenadas abaixo.')
    setStatus('locating')
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => { setStatus('idle'); onLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }) },
      (err) => {
        setStatus('idle')
        setGeoError(err.code === err.PERMISSION_DENIED
          ? 'Permissão de localização negada. Você pode informar as coordenadas manualmente.'
          : 'Não foi possível obter sua localização agora. Tente de novo ou informe as coordenadas.')
      },
      { timeout: 10_000, maximumAge: 60_000 },
    )
  }

  const applyManual = () => {
    const la = parseSigned(lat)
    const lo = parseSigned(lng)
    if (la === null || lo === null || Math.abs(la) > 90 || Math.abs(lo) > 180) {
      return setManualError('Use latitude entre -90 e 90 e longitude entre -180 e 180 (ex.: -23,5505 e -46,6333).')
    }
    setManualError(null)
    onLocation({ latitude: la, longitude: lo })
  }

  if (location) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-herb-soft p-3">
        <p className="flex items-center gap-2 text-sm">
          <span className="text-herb"><Icon name="pin" /></span>
          <span>
            <b>{t("Localização definida")}</b>{' '}
            <span className="tabular-nums text-ink-muted">({location.latitude.toFixed(3)}, {location.longitude.toFixed(3)})</span>
          </span>
        </p>
        <button type="button" onClick={() => onLocation(null)} disabled={disabled}
          className={`min-h-11 cursor-pointer rounded-lg px-2 text-sm font-bold text-herb ${focusRing}`}>{t("Trocar")}</button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-ink-muted">{t(" A busca do iFood precisa de uma localização escolhida por você. As coordenadas vão só para a consulta ao iFood — não são enviadas ao modelo de IA nem deduzidas da conversa. ")}</p>
      <Button variant="secondary" icon="pin" onClick={locate} loading={status === 'locating'} disabled={disabled}>
        {status === 'locating' ? t("Obtendo localização…") : t("Usar minha localização atual")}
      </Button>
      {geoError && <p role="alert" className="text-sm font-semibold text-tomato">{geoError}</p>}
      <details className="rounded-xl border border-line p-3">
        <summary className={`cursor-pointer text-sm font-bold ${focusRing}`}>{t("Informar coordenadas manualmente")}</summary>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div>
            <label htmlFor="lat" className="mb-1 block text-xs font-bold text-ink-muted">Latitude</label>
            <input id="lat" className={inputCls} inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)}
              aria-invalid={!!manualError} aria-describedby={manualError ? 'coord-err' : undefined} />
          </div>
          <div>
            <label htmlFor="lng" className="mb-1 block text-xs font-bold text-ink-muted">Longitude</label>
            <input id="lng" className={inputCls} inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)}
              aria-invalid={!!manualError} aria-describedby={manualError ? 'coord-err' : undefined} />
          </div>
        </div>
        {manualError && <p id="coord-err" className="mt-2 text-sm font-semibold text-tomato">{manualError}</p>}
        <div className="mt-3"><Button variant="secondary" onClick={applyManual}>{t("Usar estas coordenadas")}</Button></div>
      </details>
    </div>
  )
}

function parseSigned(raw: string): number | null {
  const s = raw.trim()
  const neg = s.startsWith('-')
  const n = parseNumber(neg ? s.slice(1) : s)
  return n === null || Number.isNaN(n) ? null : neg ? -n : n
}

function MarketResult({ result, budgetCents, onCart, cartEnabled }: { result: AgentResponse; budgetCents: number | null; onCart: (products: SelectedProduct[]) => void; cartEnabled: boolean }) {
  const { data } = result
  const searched = data.buscas.length > 0
  const failed = searched && data.buscas.every((b) => b.status === 'error')
  const partlyFailed = !failed && data.buscas.some((b) => b.status === 'error')
  const empty = searched && data.buscas.every((b) => b.status === 'empty')
  const noneSelected = data.produtos.length === 0 && data.buscas.some((b) => b.status === 'success')
  const options = data.opcoes
    .map((o, i) => ({ o, i, products: data.produtos.filter((p) => p.opcao_indice === i), cost: data.custos.find((c) => c.opcao_indice === i) }))
    .filter((x) => x.products.length > 0 || x.o.faltantes.length > 0)

  return (
    <section className="space-y-4" aria-labelledby="result-title">
      <h3 id="result-title" className="sr-only">{t("Resultado da consulta")}</h3>

      {result.mcpToolCalled ? (
        <p className="flex items-center gap-2 text-sm text-ink-muted"><Icon name="check" className="size-4" />{t(" Busca enviada ao iFood · confira os resultados abaixo.")}</p>
      ) : (
        <Notice tone="warn" title={t("O iFood não foi consultado nesta resposta")}>{t(" O agente respondeu sem chamar a ferramenta de busca. Veja a mensagem abaixo e tente consultar de novo. ")}</Notice>
      )}

      <AgentNote text={data.mensagem} />

      {failed && (
        <Notice tone="danger" role="alert" title={t("A consulta ao iFood falhou")}>{t(" Nenhum produto foi confirmado. Isso é uma falha de consulta, não um catálogo vazio. ")}</Notice>
      )}
      {partlyFailed && (
        <Notice tone="warn" title={t("Parte das consultas falhou")}>{t(" Itens sem produto podem não ter sido consultados com sucesso. Tente consultar de novo. ")}</Notice>
      )}
      {empty && (
        <Notice tone="info" role="status" title={t("Nenhum produto encontrado")}>{t(" O iFood não retornou produtos de parceiros abertos para esses termos, filtros e destino. Isso não significa que todas as lojas estejam fechadas. ")}</Notice>
      )}
      {noneSelected && (
        <Notice tone="info" role="status" title={t("Nenhum produto selecionado")}>{t(" O iFood retornou resultados, mas nenhum foi associado aos itens que faltam. ")}</Notice>
      )}

      {options.map(({ o, i, products, cost }) => (
        <Card as="article" key={`${i}-${o.titulo}`} className="space-y-4">
          <div className="space-y-1">
            <StrategyTag s={o.estrategia} />
            <h4 className="text-lg font-bold">{o.titulo}</h4>
          </div>
          <ul className="space-y-3">
            {o.faltantes.map((f) => {
              const matches = products.filter((p) => normalized(p.faltante) === normalized(f))
              return (
                <li key={f}>
                  <p className="mb-1.5 text-sm font-bold">{t("Para: ")}<span className="text-tomato">{f}</span></p>
                  {matches.length === 0 ? (
                    <p className="rounded-xl border-2 border-dashed border-line p-3 text-sm text-ink-muted">{t(" Nenhum produto selecionado para este item. ")}</p>
                  ) : (
                    <ul className="space-y-2">{matches.map((p) => <ProductRow key={`${p.merchant_id}-${p.item_id}`} p={p} />)}</ul>
                  )}
                </li>
              )
            })}
          </ul>
          {cost && <CostCard cost={cost} budgetCents={budgetCents} stores={new Set(products.map((p) => p.merchant_id)).size} />}
          {products.length > 0 && <Button icon="cart" disabled={!cartEnabled} onClick={() => onCart(products)}>{t("Montar carrinho com estes itens")}</Button>}
          {products.length > 0 && !cartEnabled && <p className="text-sm text-ink-muted">{t("Escolha um endereço salvo acima para refazer a busca e montar o carrinho.")}</p>}
        </Card>
      ))}


      <Card className="space-y-2 border-dashed">
        <p className="flex items-center gap-2 font-bold"><Icon name="info" />{t(" Próximo passo")}</p>
        <p className="text-sm text-ink-muted">{t(" Se fizer sentido comprar, monte o carrinho: você ajusta quantidades e endereço e revisa tudo antes de confirmar. Nada foi adicionado a um carrinho até agora e nenhum pedido é feito por aqui. ")}</p>
      </Card>
    </section>
  )
}

function ProductRow({ p }: { p: SelectedProduct }) {
  return (
    <li className="rounded-xl border border-line bg-paper p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold break-words">{p.nome_observado}</p>
          <p className="flex items-center gap-1 text-sm text-ink-muted">
            <Icon name="store" className="size-4" />{p.loja_observada ?? t("Loja não informada")}
          </p>
        </div>
        <p className="shrink-0 text-right font-bold tabular-nums">
          {p.preco_observado_centavos === null ? <span className="text-sm text-ink-muted">{t("Preço não informado")}</span> : brl(p.preco_observado_centavos)}
        </p>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge p="MCP" />
        <Badge p="INFERRED" label={`${p.quantidade_embalagens} embalagem(ns) · não confirmado`} />
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 text-sm">
        <dt className="text-ink-muted">{t("Frete observado")}</dt>
        <dd className="text-right tabular-nums">{p.frete_observado_centavos === null ? t("não informado") : brl(p.frete_observado_centavos)}</dd>
        <dt className="text-ink-muted">{t("Pedido mínimo")}</dt>
        <dd className="text-right tabular-nums">{p.minimo_pedido_centavos === null ? t("não informado") : brl(p.minimo_pedido_centavos)}</dd>
      </dl>
    </li>
  )
}

function CostCard({ cost, budgetCents, stores }: { cost: CostSummary; budgetCents: number | null; stores: number }) {
  const row = (label: string, value: number, strong = false) => (
    <div className={`flex items-baseline gap-2 ${strong ? 'font-bold' : ''}`}>
      <dt>{t(label)}</dt>
      <span aria-hidden="true" className="flex-1 border-b border-dotted border-ink-muted/50" />
      <dd className="tabular-nums">{brl(value)}</dd>
    </div>
  )
  return (
    <div className="space-y-3 rounded-xl bg-surface-2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold">{t("Custo conhecido")}</p>
        <Badge p="ESTIMATED" label={t("Estimativa — não é o total final")} />
      </div>
      <dl className="space-y-1 text-sm">
        {row(t("Subtotal dos itens"), cost.subtotal_conhecido_centavos)}
        {row(t("Frete conhecido"), cost.taxas_conhecidas_centavos)}
        {row(t("Total conhecido"), cost.total_conhecido_centavos, true)}
      </dl>
      <ul className="list-disc space-y-1 pl-4 text-sm text-ink-muted">
        {!cost.precos_completos && <li>{t("Há itens sem preço informado; eles não entram na soma.")}</li>}
        {!cost.fretes_completos && <li>{t("O frete não foi informado (ou variou) para todas as lojas.")}</li>}
        {stores > 1 && <li>{t("Os produtos vêm de ")}{stores}{t(" lojas diferentes; cada loja cobra a própria entrega.")}</li>}
        <li>{t("Quantidade de embalagens, taxas e pedido mínimo ainda precisam ser revisados antes de qualquer compra.")}</li>
      </ul>
      {cost.orcamento_status === 'over' && budgetCents !== null && (
        <Notice tone="warn" title={t("Acima do orçamento")}>{t(" Só o custo já conhecido (")}{brl(cost.total_conhecido_centavos)}{t(") passa do seu orçamento de ")}{brl(budgetCents)}.
        </Notice>
      )}
      {cost.orcamento_status === 'unknown_total' && budgetCents !== null && (
        <p className="text-sm">
          <b>{t("Orçamento de ")}{brl(budgetCents)}:</b>{t(" não dá para afirmar que cabe, porque o total final ainda não é conhecido. ")}</p>
      )}
    </div>
  )
}
