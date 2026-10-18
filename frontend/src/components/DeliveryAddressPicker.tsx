import { useEffect, useState } from 'react'
import { ApiError, api } from '../api'
import type { Address } from '../types'
import { Button, Notice } from './ui'

type AddressState = { status: 'idle' } | { status: 'loading' } | { status: 'error'; error: ApiError } | { status: 'ready'; addresses: Address[] }

export function useDeliveryAddress(enabled: boolean) {
  const [state, setState] = useState<AddressState>({ status: 'idle' })
  const [selectedId, select] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    if (!enabled) { setState({ status: 'idle' }); select(null); return }
    let cancelled = false
    setState({ status: 'loading' })
    api.addresses().then(addresses => {
      if (cancelled) return
      setState({ status: 'ready', addresses })
      select(current => addresses.some(a => a.id === current) ? current : addresses.length === 1 ? addresses[0].id : null)
    }).catch(error => {
      if (cancelled) return
      select(null)
      setState({ status: 'error', error: error instanceof ApiError ? error : new ApiError('failed', 'Não foi possível consultar os endereços.') })
    })
    return () => { cancelled = true }
  }, [enabled, revision])
  const selected = state.status === 'ready' ? state.addresses.find(a => a.id === selectedId) ?? null : null
  return { state, selected, select, reload: () => { select(null); setState({ status: 'loading' }); setRevision(v => v + 1) } }
}

export function DeliveryAddressPicker({ state, selected, onSelect, onReload, onReconnect, disabled }: {
  state: AddressState; selected: Address | null; onSelect: (id: string) => void; onReload: () => void; onReconnect: () => void; disabled: boolean
}) {
  if (state.status === 'idle' || state.status === 'loading') return <p role="status">Consultando endereços salvos no iFood…</p>
  if (state.status === 'error') return (
    <Notice tone="danger" role="alert" title="Não foi possível consultar os endereços">
      <p>{state.error.message}</p>
      <p>Isso não significa que sua conta esteja sem endereços.</p>
      {state.error.kind === 'auth' && <Button onClick={onReconnect}>Reconectar conta iFood</Button>}
      <Button variant="secondary" onClick={onReload} disabled={disabled}>Tentar consultar novamente</Button>
    </Notice>
  )
  if (!state.addresses.length) return <Notice title="Sua conta não retornou endereços salvos">
    <p>Cadastre um endereço no app iFood e atualize esta lista. O cadastro de endereço por aqui ainda não está disponível.</p>
    <Button variant="secondary" onClick={onReload} disabled={disabled}>Atualizar endereços</Button>
  </Notice>
  return <fieldset className="space-y-2">
    <legend className="font-bold">Onde você quer receber?</legend>
    <p className="text-sm text-ink-muted">A busca usará este destino. Se você trocar, os resultados anteriores serão descartados.</p>
    {state.addresses.map(address => {
      const valid = address.latitude !== null && address.longitude !== null
      return <label key={address.id} className="flex items-start gap-3 rounded-xl border border-line p-3 text-sm">
        <input type="radio" name="delivery-address" checked={selected?.id === address.id} disabled={disabled || !valid}
          onChange={() => onSelect(address.id)} className="mt-1 size-5" />
        <span><b>{address.rotulo ?? 'Endereço salvo'}</b><br />{address.endereco ?? 'Detalhes não informados'}
          {!valid && <span className="block text-tomato">O iFood não retornou coordenadas válidas para este endereço.</span>}</span>
      </label>
    })}
    <Button variant="ghost" onClick={onReload} disabled={disabled}>Atualizar endereços</Button>
  </fieldset>
}
