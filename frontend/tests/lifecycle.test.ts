import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { api } from '../src/api'
import { useDeliveryAddress } from '../src/components/DeliveryAddressPicker'
import { CartStep } from '../src/steps/CartStep'
import { Button } from '../src/components/ui'
import type { Address, CartProposal, CartResult, SelectedProduct } from '../src/types'

const address: Address = { id: 'address-a', latitude: -23, longitude: -46, rotulo: 'Teste', endereco: 'Sintético', ultimo_usado: false }
const deferred = <T,>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(r => { resolve = r })
  return { promise, resolve }
}

test('changing connection discards old addresses and ignores late responses', async () => {
  const old = deferred<Address[]>(), fresh = deferred<Address[]>()
  const original = api.addresses
  let calls = 0
  api.addresses = () => (++calls === 1 ? old.promise : fresh.promise)
  let state!: ReturnType<typeof useDeliveryAddress>
  function Harness({ connection }: { connection: string }) {
    state = useDeliveryAddress(true, connection)
    return null
  }
  let tree!: ReactTestRenderer
  try {
    await act(async () => { tree = create(createElement(Harness, { connection: 'first' })) })
    await act(async () => { tree.update(createElement(Harness, { connection: 'second' })) })
    await act(async () => { fresh.resolve([{ ...address, id: 'address-b' }]) })
    assert.equal(state.selected?.id, 'address-b')
    await act(async () => { old.resolve([address]) })
    assert.equal(state.selected?.id, 'address-b')
    assert.equal(calls, 2)
  } finally {
    act(() => tree?.unmount())
    api.addresses = original
  }
})

test('a ready address is cleared immediately when the connection changes', async () => {
  const original = api.addresses
  let calls = 0
  api.addresses = () => ++calls === 1 ? Promise.resolve([address]) : new Promise(() => {})
  const selections: Array<string | undefined> = []
  function Harness({ connection }: { connection: string }) {
    selections.push(useDeliveryAddress(true, connection).selected?.id)
    return null
  }
  let tree!: ReactTestRenderer
  try {
    await act(async () => { tree = create(createElement(Harness, { connection: 'first' })) })
    assert.equal(selections.at(-1), 'address-a')
    selections.length = 0
    await act(async () => { tree.update(createElement(Harness, { connection: 'second' })) })
    assert.ok(selections.every(value => value === undefined))
  } finally {
    act(() => tree?.unmount())
    api.addresses = original
  }
})

test('cart keeps parent navigation busy until confirmation resolves', async () => {
  globalThis.window = { scrollTo() {} } as unknown as Window & typeof globalThis
  globalThis.document = { getElementById: () => null } as unknown as Document
  const originalProposal = api.cartProposal, originalConfirm = api.confirmCart
  const confirmation = deferred<CartResult>()
  const proposal = { id: 'proposal', snapshot_hash: 'hash', loja: 'Loja', linhas: [],
    subtotal_conhecido_centavos: 100, precos_completos: true, frete_observado_centavos: null,
    minimo_pedido_centavos: null, expira_em_segundos: 600 } as unknown as CartProposal
  api.cartProposal = async () => proposal
  api.confirmCart = () => confirmation.promise
  const states: boolean[] = []
  const product = { item_id: 'item', merchant_id: 'merchant', nome_observado: 'Produto',
    preco_observado_centavos: 100, quantidade_embalagens: 1 } as SelectedProduct
  let tree!: ReactTestRenderer
  try {
    await act(async () => { tree = create(createElement(CartStep, {
      option: { titulo: 'Refeição', estrategia: 'CONVENIENCE', usa: [], faltantes: ['produto'], justificativa: '', provenance: 'INFERRED' },
      products: [product], address, onBusyChange: v => states.push(v),
      onBack() {}, onRestart() {}, onChangeAddress() {},
    })) })
    await act(async () => { await tree.root.findAllByType(Button).find(b => b.props.children === 'Revisar carrinho')!.props.onClick() })
    let pending!: Promise<void>
    act(() => { pending = tree.root.findAllByType(Button).find(b => b.props.children === 'Confirmar e criar carrinho no iFood')!.props.onClick() })
    assert.equal(states.at(-1), true)
    await act(async () => {
      confirmation.resolve({ cart_id: 'cart', verificacao: 'unverified', itens: [], avisos: [], limitacoes: [],
        totais: { subtotal_centavos: null, entrega_centavos: null, desconto_centavos: null, total_centavos: null } } as unknown as CartResult)
      await pending
    })
    assert.equal(states.at(-1), false)
  } finally {
    act(() => tree?.unmount())
    api.cartProposal = originalProposal
    api.confirmCart = originalConfirm
  }
})
