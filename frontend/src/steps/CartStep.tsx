import { useEffect, useMemo, useState } from 'react'
import { ApiError, api } from '../api'
import { Icon } from '../components/icons'
import { Badge, Button, Card, Chip, Limitations, Loading, Notice, StageTitle, brl, focusRing } from '../components/ui'
import type { Address, CartProposal, CartResult, MealOption, SelectedProduct } from '../types'
import { StrategyTag } from './OptionsStep'

// Carrinho em três momentos: montar → revisar a proposta → criar no iFood (só após confirmação explícita).
type Phase = 'build' | 'review' | 'created'

interface Store { id: string; name: string; products: SelectedProduct[]; subtotal: number }

const asApiError = (e: unknown) => (e instanceof ApiError ? e : new ApiError('failed', 'Erro inesperado. Tente novamente.'))

// Mesma regra do backend (PLANO-BACKEND §11): maior cobertura de faltantes, depois menor subtotal.
function groupStores(products: SelectedProduct[]): Store[] {
  const map = new Map<string, Store>()
  for (const p of products) {
    const s = map.get(p.merchant_id) ?? { id: p.merchant_id, name: p.loja_observada ?? 'Loja não informada', products: [], subtotal: 0 }
    s.products.push(p)
    s.subtotal += (p.preco_observado_centavos ?? 0) * p.quantidade_embalagens
    map.set(p.merchant_id, s)
  }
  return [...map.values()].sort((a, b) => b.products.length - a.products.length || a.subtotal - b.subtotal)
}

export function CartStep({ option, products, address, onChangeAddress, onBack, onRestart }: {
  option: MealOption
  products: SelectedProduct[]
  address: Address
  onChangeAddress: () => void
  onBack: () => void
  onRestart: () => void
}) {
  const stores = useMemo(() => groupStores(products), [products])
  const [storeId, setStoreId] = useState(stores[0]?.id ?? '')
  const [qty, setQty] = useState<Record<string, number>>(() => Object.fromEntries(products.map((p) => [p.item_id, p.quantidade_embalagens])))
  const addressId = address.id
  const [phase, setPhase] = useState<Phase>('build')
  const [proposal, setProposal] = useState<CartProposal | null>(null)
  const [result, setResult] = useState<CartResult | null>(null)
  const [busy, setBusy] = useState<null | 'addresses' | 'proposal' | 'confirm'>(null)
  const [error, setError] = useState<ApiError | null>(null)

  const store = stores.find((s) => s.id === storeId) ?? stores[0]
  const lines = store ? store.products.filter((p) => (qty[p.item_id] ?? 0) > 0) : []

  useEffect(() => {
    window.scrollTo({ top: 0 })
    document.getElementById('stage-title')?.focus({ preventScroll: true })
  }, [phase])

  async function review() {
    if (!store || !addressId || lines.length === 0) return
    setBusy('proposal')
    setError(null)
    try {
      setProposal(await api.cartProposal({
        merchant_id: store.id, address_id: addressId,
        linhas: lines.map((p) => ({ item_id: p.item_id, quantidade: qty[p.item_id] })),
      }))
      setPhase('review')
    } catch (e) {
      setError(asApiError(e))
    } finally {
      setBusy(null)
    }
  }

  async function confirm() {
    if (!proposal) return
    setBusy('confirm')
    setError(null)
    try {
      setResult(await api.confirmCart(proposal))
      setPhase('created')
    } catch (e) {
      setError(asApiError(e))
    } finally {
      setBusy(null)
    }
  }

  const setQuantity = (id: string, n: number) => setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(100, n)) }))

  if (phase === 'created' && result) return <CartCreated result={result} address={address} onBack={onBack} onRestart={onRestart} />

  if (phase === 'review' && proposal) {
    return (
      <div className="space-y-4">
        <StageTitle kicker="Confira antes de confirmar">Revise seu carrinho.</StageTitle>
        <p className="text-ink-muted">Nenhum carrinho foi criado ainda. Ao confirmar, o carrinho é criado na sua conta.</p>

        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 font-bold"><Icon name="store" className="size-4" />{proposal.loja ?? 'Loja não informada'}</p>
            <Badge p="MCP" />
          </div>
          <ul className="space-y-2">
            {proposal.linhas.map((l) => (
              <li key={l.item_id} className="flex items-start justify-between gap-3 rounded-xl border border-line bg-paper p-3">
                <div className="min-w-0">
                  <p className="font-bold break-words">{l.nome}</p>
                  <p className="text-sm text-ink-muted tabular-nums">
                    {l.quantidade} × {l.preco_unitario_centavos === null ? 'preço não informado' : brl(l.preco_unitario_centavos)}
                  </p>
                </div>
                <p className="shrink-0 text-right font-bold tabular-nums">{l.subtotal_centavos === null ? '—' : brl(l.subtotal_centavos)}</p>
              </li>
            ))}
          </ul>
          {address && (
            <p className="flex items-start gap-2 rounded-xl bg-surface-2 p-3 text-sm">
              <span className="text-herb"><Icon name="pin" className="size-4" /></span>
              <span><b>Entrega em:</b> {address.rotulo ? `${address.rotulo} · ` : ''}{address.endereco ?? 'endereço salvo no iFood'}</span>
            </p>
          )}
          <div className="space-y-3 rounded-xl bg-surface-2 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold">Subtotal estimado</p>
              <Badge p="ESTIMATED" label="Estimativa — o iFood calcula o total" />
            </div>
            <dl className="space-y-1 text-sm">
              <DotRow label="Itens" value={brl(proposal.subtotal_conhecido_centavos)} strong />
              {proposal.frete_observado_centavos !== null && <DotRow label="Frete observado na busca" value={brl(proposal.frete_observado_centavos)} />}
              {proposal.minimo_pedido_centavos !== null && <DotRow label="Pedido mínimo da loja" value={brl(proposal.minimo_pedido_centavos)} />}
            </dl>
            <ul className="list-disc space-y-1 pl-4 text-sm text-ink-muted">
              {!proposal.precos_completos && <li>Há itens sem preço informado; eles não entram na soma.</li>}
              <li>Esta revisão vale por {Math.round(proposal.expira_em_segundos / 60)} minutos.</li>
            </ul>
          </div>
        </Card>

        <Notice tone="info" title="O que acontece ao confirmar">
          <p>Criamos o carrinho na sua conta iFood com estes itens e quantidades. Entrega, pagamento e envio do pedido continuam com você, no app do iFood.</p>
        </Notice>

        {busy === 'confirm' && <Loading label="Criando o carrinho no iFood…" detail="Depois conferimos os totais calculados pelo iFood." />}
        {error && busy === null && <CartError error={error} confirming />}

        {busy !== 'confirm' && (
          <div className="space-y-2">
            <Button icon="cart" onClick={confirm}>Confirmar e criar carrinho no iFood</Button>
            <Button variant="secondary" icon="pencil" onClick={() => { setError(null); setPhase('build') }}>Editar itens</Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <StageTitle kicker="Você decide o que vai para o carrinho">Monte seu carrinho.</StageTitle>
      <p className="text-ink-muted">Ajuste as quantidades e confira o destino usado na busca. Nenhum carrinho é criado antes da sua confirmação.</p>

      <Card className="space-y-2">
        <StrategyTag s={option.estrategia} />
        <h3 className="text-xl font-bold">{option.titulo}</h3>
      </Card>

      {stores.length > 1 && (
        <Card as="section" className="space-y-3">
          <h3 className="text-lg font-bold">Escolha a loja</h3>
          <p className="text-sm text-ink-muted">Cada carrinho do iFood é de uma única loja. Mostramos primeiro a que cobre mais itens.</p>
          <div className="flex flex-wrap gap-2">
            {stores.map((s) => (
              <Chip key={s.id} pressed={s.id === store?.id} onClick={() => setStoreId(s.id)} disabled={busy !== null}>
                {s.name} · {s.products.length} {s.products.length === 1 ? 'item' : 'itens'}
              </Chip>
            ))}
          </div>
        </Card>
      )}

      <Card as="section" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-bold">Itens</h3>
          <Badge p="DECLARED" label="Quantidade confirmada por você" />
        </div>
        <ul className="space-y-2">
          {store?.products.map((p) => {
            const n = qty[p.item_id] ?? 0
            return (
              <li key={p.item_id} className={`rounded-xl border border-line bg-paper p-3 ${n === 0 ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold break-words">{p.nome_observado}</p>
                    <p className="text-sm text-ink-muted">Para: <span className="text-tomato">{p.faltante}</span></p>
                  </div>
                  <p className="shrink-0 text-right font-bold tabular-nums">
                    {p.preco_observado_centavos === null ? <span className="text-sm text-ink-muted">Preço não informado</span> : brl(p.preco_observado_centavos)}
                  </p>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <Badge p="MCP" />
                  <Stepper label={p.nome_observado} value={n} onChange={(v) => setQuantity(p.item_id, v)} disabled={busy !== null} />
                </div>
              </li>
            )
          })}
        </ul>
        {lines.length === 0 && <p className="text-sm font-semibold text-tomato" role="alert">Mantenha pelo menos um item para montar o carrinho.</p>}
      </Card>

      <Card as="section" className="space-y-3">
        <h3 className="text-lg font-bold">Endereço de entrega</h3>
        <p className="text-sm"><b>{address.rotulo ?? 'Endereço selecionado'}</b> · {address.endereco ?? 'Salvo no iFood'}</p>
        <p className="text-sm text-ink-muted">É o mesmo destino usado para buscar estes produtos.</p>
        <Button variant="secondary" onClick={onChangeAddress} disabled={busy !== null}>Trocar endereço e refazer busca</Button>
      </Card>

      {busy === 'proposal' && <Loading label="Preparando a revisão…" />}
      {error && busy === null && <CartError error={error} />}

      {busy !== 'proposal' && (
        <div className="space-y-2">
          <Button icon="check" onClick={review} disabled={!addressId || lines.length === 0 || busy !== null}>Revisar carrinho</Button>
          <Button variant="ghost" icon="back" onClick={onBack}>Voltar aos produtos</Button>
        </div>
      )}
    </div>
  )
}

function CartCreated({ result, address, onBack, onRestart }: { result: CartResult; address: Address | null; onBack: () => void; onRestart: () => void }) {
  const t = result.totais
  return (
    <div className="space-y-4">
      <StageTitle kicker="Carrinho pronto no iFood">Agora é só finalizar no iFood.</StageTitle>
      <Notice tone="success" role="status" title="Carrinho criado na sua conta iFood">
        <p>Abra o app do iFood para escolher a entrega, pagar e enviar o pedido. Nenhum pedido foi feito por aqui.</p>
      </Notice>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 font-bold"><Icon name="store" className="size-4" />{result.loja ?? 'Loja não informada'}</p>
          <Badge p="MCP" label="Valores calculados pelo iFood" />
        </div>
        {result.itens.length > 0 && (
          <ul className="space-y-2">
            {result.itens.map((i, idx) => (
              <li key={`${i.item_id ?? idx}`} className="flex items-start justify-between gap-3 rounded-xl border border-line bg-paper p-3">
                <p className="min-w-0 font-bold break-words">{i.quantidade !== null && <span className="tabular-nums">{i.quantidade} × </span>}{i.nome ?? 'Item do carrinho'}</p>
                <p className="shrink-0 font-bold tabular-nums">{i.preco_centavos === null ? '—' : brl(i.preco_centavos)}</p>
              </li>
            ))}
          </ul>
        )}
        <dl className="space-y-1 rounded-xl bg-surface-2 p-4 text-sm">
          {t.subtotal_centavos !== null && <DotRow label="Subtotal" value={brl(t.subtotal_centavos)} />}
          {t.entrega_centavos !== null && <DotRow label="Entrega" value={brl(t.entrega_centavos)} />}
          {t.desconto_centavos !== null && t.desconto_centavos > 0 && <DotRow label="Descontos" value={`− ${brl(t.desconto_centavos)}`} />}
          <DotRow label="Total" value={t.total_centavos === null ? 'confira no app' : brl(t.total_centavos)} strong />
        </dl>
        {address && (
          <p className="flex items-start gap-2 text-sm text-ink-muted">
            <span className="text-herb"><Icon name="pin" className="size-4" /></span>
            <span>{address.rotulo ? `${address.rotulo} · ` : ''}{address.endereco ?? 'endereço salvo no iFood'}</span>
          </p>
        )}
      </Card>

      {result.avisos.length > 0 && (
        <Notice tone="warn" title="Avisos do iFood sobre o carrinho">
          <ul className="list-disc space-y-1 pl-4">{result.avisos.map((a) => <li key={a}>{a}</li>)}</ul>
        </Notice>
      )}
      <Limitations items={result.limitacoes} />

      <details className="rounded-2xl border border-line bg-surface p-4 text-sm">
        <summary className={`cursor-pointer font-bold ${focusRing}`}>Detalhes técnicos da integração</summary>
        <p className="mt-2 text-ink-muted">
          Criado com <code className="font-mono">createCart</code> e conferido com <code className="font-mono">getCart</code> após a sua confirmação.
          Identificador: <code className="font-mono break-all">{result.cart_id}</code>
        </p>
      </details>

      <div className="space-y-2">
        <Button variant="secondary" icon="back" onClick={onBack}>Voltar aos produtos</Button>
        <Button variant="ghost" icon="plus" onClick={onRestart}>Começar uma nova consulta</Button>
      </div>
    </div>
  )
}

function CartError({ error, confirming = false }: { error: ApiError; confirming?: boolean }) {
  return (
    <Notice tone="danger" role="alert" title={error.kind === 'auth' ? 'Conexão com o iFood necessária' : confirming ? 'O carrinho não foi confirmado' : 'Não foi possível continuar'}>
      <p>{error.message}</p>
      <p>Nenhum pedido foi feito.</p>
    </Notice>
  )
}

function Stepper({ label, value, onChange, disabled }: { label: string; value: number; onChange: (n: number) => void; disabled: boolean }) {
  const btn = `inline-flex size-11 cursor-pointer items-center justify-center rounded-xl border border-line bg-surface text-ink hover:border-herb hover:text-herb disabled:cursor-not-allowed disabled:opacity-55 ${focusRing}`
  return (
    <div className="flex items-center gap-1" role="group" aria-label={`Quantidade de ${label}`}>
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={disabled || value === 0}
        aria-label={value === 1 ? `Remover ${label}` : `Diminuir ${label}`}>
        <Icon name={value === 1 ? 'trash' : 'minus'} className="size-4" />
      </button>
      <span className="min-w-8 text-center font-bold tabular-nums" aria-live="polite">{value}</span>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={disabled || value >= 100} aria-label={`Aumentar ${label}`}>
        <Icon name="plus" className="size-4" />
      </button>
    </div>
  )
}

function DotRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-baseline gap-2 ${strong ? 'font-bold' : ''}`}>
      <dt>{label}</dt>
      <span aria-hidden="true" className="flex-1 border-b border-dotted border-ink-muted/50" />
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}
