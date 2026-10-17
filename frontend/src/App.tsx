import { useState } from 'react'
import type { ReactNode } from 'react'
import { confirmCart, EXAMPLE_TEXT, parseContext, planMeals, searchProducts } from './mock'
import type { CartResult, MealOption, ProductCandidate, Profile, UserContext } from './types'
import { Badge, Button, Card, brl } from './components/ui'

type Step = 'input' | 'confirm' | 'profile' | 'options' | 'products' | 'done'
const STEPS: Step[] = ['input', 'confirm', 'profile', 'options', 'products', 'done']
const STRATEGY_LABEL = {
  USE_WHAT_I_HAVE: 'Sem comprar nada',
  COMPLETE_WITH_MARKET: 'Completar no Mercado',
  CONVENIENCE: 'Conveniência',
} as const
const PREFS = [
  ['VEGETARIAN', 'Vegetariano'],
  ['VEGAN', 'Vegano'],
] as const
const SENSITIVE = [
  ['allergies', 'Alergia a amendoim'],
  ['intolerances', 'Intolerância à lactose'],
  ['healthConditions', 'Diabetes'],
] as const

const emptyProfile: Profile = {
  preferences: [], allergies: [], intolerances: [], healthConditions: [], useSensitive: false, declined: false,
}

export default function App() {
  const [step, setStep] = useState<Step>('input')
  const [loading, setLoading] = useState(false)
  const [text, setText] = useState('')
  const [ctx, setCtx] = useState<UserContext | null>(null)
  const [newItem, setNewItem] = useState('')
  const [profile, setProfile] = useState<Profile>(emptyProfile)
  const [options, setOptions] = useState<MealOption[]>([])
  const [chosen, setChosen] = useState<MealOption | null>(null)
  const [products, setProducts] = useState<ProductCandidate[]>([])
  const [cart, setCart] = useState<CartResult | null>(null)
  const [agreed, setAgreed] = useState(false)

  const run = async (fn: () => Promise<void>) => {
    setLoading(true)
    try { await fn() } finally { setLoading(false) }
  }

  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
  const subtotal = products.reduce((s, p) => s + p.priceCents, 0)
  const restart = () => {
    setStep('input'); setText(''); setCtx(null); setOptions([]); setChosen(null)
    setProducts([]); setCart(null); setAgreed(false)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <header className="sticky top-0 z-10 bg-[#ea1d2c] px-4 pb-3 pt-4 text-white">
        <h1 className="text-lg font-bold">Despensa Reversa</h1>
        <p className="text-xs opacity-90">Ambiente de demonstração · dados simulados</p>
        <div className="mt-2 flex gap-1">
          {STEPS.map((s, i) => (
            <div key={s} className={`h-1 flex-1 rounded ${i <= STEPS.indexOf(step) ? 'bg-white' : 'bg-white/30'}`} />
          ))}
        </div>
      </header>

      <main className="flex-1 space-y-3 p-4 pb-8">
        {step === 'input' && (
          <>
            <Card>
              <label className="mb-2 block font-semibold">O que você tem em casa?</label>
              <textarea
                className="h-36 w-full rounded-lg border border-gray-300 p-3 text-base"
                placeholder="Conte o que tem, quantas pessoas, tempo e orçamento…"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <button className="mt-2 text-sm text-[#ea1d2c] underline" onClick={() => setText(EXAMPLE_TEXT)}>
                Usar exemplo
              </button>
            </Card>
            <Button
              disabled={!text.trim() || loading}
              onClick={() => run(async () => { setCtx(await parseContext(text)); setStep('confirm') })}
            >
              {loading ? 'Analisando…' : 'Continuar'}
            </Button>
          </>
        )}

        {step === 'confirm' && ctx && (
          <>
            <Card>
              <h2 className="mb-1 font-semibold">Confirme seus ingredientes</h2>
              <p className="mb-3 text-xs text-gray-500">
                Reconhecidos pela IA. Corrija o que estiver errado; não assumimos quantidades.
              </p>
              <div className="flex flex-wrap gap-2">
                {ctx.items.map((it) => (
                  <span key={it.id} className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-sm">
                    {it.name}
                    <button
                      aria-label={`remover ${it.name}`}
                      className="text-gray-500"
                      onClick={() => setCtx({ ...ctx, items: ctx.items.filter((x) => x.id !== it.id) })}
                    >×</button>
                  </span>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2"
                  placeholder="Adicionar ingrediente"
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                />
                <button
                  className="rounded-lg bg-gray-800 px-4 text-white"
                  onClick={() => {
                    const n = newItem.trim().toLowerCase()
                    if (!n) return
                    setCtx({ ...ctx, items: [...ctx.items, { id: n, name: n, provenance: 'DECLARED', confirmed: true }] })
                    setNewItem('')
                  }}
                >+</button>
              </div>
            </Card>
            <Card>
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div><div className="text-lg font-bold">{ctx.people}</div>pessoas</div>
                <div><div className="text-lg font-bold">{ctx.timeMin} min</div>tempo</div>
                <div><div className="text-lg font-bold">{brl(ctx.budgetCents)}</div>orçamento</div>
              </div>
              <div className="mt-2 text-center"><Badge p="INFERRED" /></div>
            </Card>
            <Button disabled={ctx.items.length === 0} onClick={() => setStep('profile')}>Confirmar ingredientes</Button>
          </>
        )}

        {step === 'profile' && ctx && (
          <>
            <Card>
              <h2 className="mb-2 font-semibold">Preferências (opcional)</h2>
              <div className="flex flex-wrap gap-2">
                {PREFS.map(([k, label]) => (
                  <Chip key={k} on={profile.preferences.includes(k)}
                    onClick={() => setProfile({ ...profile, preferences: toggle(profile.preferences, k) })}>{label}</Chip>
                ))}
              </div>
            </Card>
            <Card>
              <h2 className="mb-1 font-semibold">Restrições e saúde (opcional)</h2>
              <p className="mb-3 text-xs text-gray-500">
                Usadas só para sinalizar riscos. Não substituem orientação médica nem garantem segurança de alérgenos.
              </p>
              <div className="flex flex-wrap gap-2">
                {SENSITIVE.map(([k, label]) => (
                  <Chip key={k} on={profile[k].includes(label)}
                    onClick={() => setProfile({ ...profile, [k]: toggle(profile[k], label), declined: false })}>{label}</Chip>
                ))}
              </div>
              <label className="mt-3 flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={profile.useSensitive}
                  onChange={(e) => setProfile({ ...profile, useSensitive: e.target.checked })} />
                Autorizo usar essas informações nas recomendações desta sessão.
              </label>
            </Card>
            <Button disabled={loading} onClick={() => run(async () => { setOptions(await planMeals(ctx, profile)); setStep('options') })}>
              {loading ? 'Planejando…' : 'Ver sugestões'}
            </Button>
            <Button variant="ghost" disabled={loading}
              onClick={() => run(async () => {
                const p = { ...emptyProfile, declined: true }
                setProfile(p); setOptions(await planMeals(ctx, p)); setStep('options')
              })}>
              Prefiro não informar
            </Button>
          </>
        )}

        {step === 'options' && (
          <>
            <h2 className="font-semibold">Sugestões para você</h2>
            {options.map((o) => (
              <Card key={o.id}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-medium text-[#ea1d2c]">{STRATEGY_LABEL[o.strategy]}</span>
                  <span className="text-xs text-gray-500">{o.timeMin} min</span>
                </div>
                <h3 className="font-semibold">{o.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{o.rationale}</p>
                <p className="mt-2 text-xs"><b>Você já tem:</b> {o.uses.join(', ')}</p>
                {o.missing.length > 0 && <p className="text-xs"><b>Falta:</b> {o.missing.join(', ')}</p>}
                {o.warnings.map((w) => <p key={w} className="mt-1 text-xs text-amber-700">⚠ {w}</p>)}
                <div className="mt-3">
                  <Button
                    disabled={loading}
                    onClick={() => run(async () => {
                      setChosen(o)
                      setProducts(o.missing.length === 0 ? [] : await searchProducts(o))
                      setStep('products')
                    })}
                  >
                    {o.missing.length === 0 ? 'Escolher' : 'Escolher e buscar produtos'}
                  </Button>
                </div>
              </Card>
            ))}
          </>
        )}

        {step === 'products' && chosen && ctx && (
          <>
            <h2 className="font-semibold">{chosen.title}</h2>
            {products.length === 0 ? (
              <Card>
                <p className="text-sm">
                  {chosen.missing.length === 0
                    ? 'Você não precisa comprar nada. Bom apetite!'
                    : 'Nenhum produto adequado encontrado no catálogo.'}
                </p>
              </Card>
            ) : (
              <>
                {products.map((p) => (
                  <Card key={p.itemId}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-gray-500">para: {p.forIngredient} · {p.merchantName}</div>
                        <div className="mt-1"><Badge p={p.provenance} /></div>
                      </div>
                      <div className="font-semibold">{brl(p.priceCents)}</div>
                    </div>
                  </Card>
                ))}
                <Card>
                  <div className="flex justify-between text-sm"><span>Subtotal dos itens</span><b>{brl(subtotal)}</b></div>
                  <div className="flex justify-between text-sm text-gray-500"><span>Orçamento</span><span>{brl(ctx.budgetCents)}</span></div>
                  <p className="mt-2 text-xs text-gray-500">Frete e taxas só serão conhecidos após criar o carrinho.</p>
                </Card>
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" className="mt-1" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                  Confirmo que quero criar este carrinho (nenhum pedido será finalizado).
                </label>
                <Button disabled={!agreed || loading}
                  onClick={() => run(async () => { setCart(await confirmCart(products)); setStep('done') })}>
                  {loading ? 'Criando carrinho…' : 'Criar carrinho'}
                </Button>
              </>
            )}
            <Button variant="ghost" onClick={() => { setAgreed(false); setStep('options') }}>Voltar às sugestões</Button>
          </>
        )}

        {step === 'done' && cart && (
          <>
            <Card>
              <h2 className="font-semibold">Carrinho criado</h2>
              <p className="mt-1 text-sm">Subtotal: <b>{brl(cart.subtotalCents)}</b></p>
              <p className="text-xs text-gray-500">Ref.: {cart.cartId}</p>
              <div className="mt-2"><Badge p={cart.provenance} /></div>
              <p className="mt-2 text-xs text-gray-500">Simulação local: nada foi enviado ao iFood.</p>
            </Card>
            <Button onClick={restart}>Começar de novo</Button>
          </>
        )}
      </main>
    </div>
  )
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm ${on ? 'border-[#ea1d2c] bg-[#ea1d2c] text-white' : 'border-gray-300 bg-white'}`}>
      {children}
    </button>
  )
}
