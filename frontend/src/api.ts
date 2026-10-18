import { getLanguage } from './accessibility/settings'
// Cliente das rotas realmente implementadas em backend/app/main.py.
// Tudo passa pelo proxy do Vite (/api, /auth, /health -> :8000); nenhuma credencial no frontend.
import type { Address, AgentRequest, AgentResponse, CartProposal, CartProposalRequest, CartResult } from './types'

export type ApiErrorKind = 'network' | 'auth' | 'validation' | 'unavailable' | 'timeout' | 'failed' | 'not_found'

export class ApiError extends Error {
  constructor(public kind: ApiErrorKind, message: string, public status?: number) {
    super(message)
  }
}

// O agente tem limite de 90 s no backend; damos uma folga antes de desistir no navegador.
const AGENT_TIMEOUT_MS = 100_000

async function request<T>(path: string, init: RequestInit = {}, timeoutMs = 15_000): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let res: Response
  try {
    res = await fetch(path, { ...init, signal: controller.signal, credentials: 'same-origin' })
  } catch {
    if (controller.signal.aborted) {
      throw new ApiError('timeout', 'A resposta demorou demais. Nenhuma compra foi realizada; tente novamente.')
    }
    throw new ApiError('network', 'Não foi possível conectar ao serviço. Suas informações continuam nesta tela; tente novamente em instantes.')
  } finally {
    clearTimeout(timer)
  }
  const raw = await res.text().catch(() => '')
  let body: unknown = null
  try { body = raw ? JSON.parse(raw) : null } catch { body = null }
  if (res.ok) return body as T
  throw toApiError(res.status, body, raw.trim() === '')
}

function toApiError(status: number, body: unknown, emptyBody: boolean): ApiError {
  const detail = (body as { detail?: unknown } | null)?.detail
  if (status === 422 && Array.isArray(detail)) {
    // Mostra apenas a mensagem de cada erro; o campo `input` pode conter dados sensíveis.
    const msgs = detail
      .map((d) => (typeof d?.msg === 'string' ? d.msg.replace(/^Value error, /, '') : null))
      .filter(Boolean)
    return new ApiError('validation', `Alguns dados não foram aceitos: ${msgs.join(' ') || 'revise os campos.'}`, status)
  }
  const text = typeof detail === 'string' ? detail : null
  switch (status) {
    case 413:
      return new ApiError('validation', text ?? 'A foto deve ter no máximo 5 MB.', status)
    case 415:
      return new ApiError('validation', text ?? 'Escolha uma imagem JPEG, PNG ou WebP.', status)
    case 401:
      return new ApiError('auth', text ?? 'Conecte sua conta iFood para continuar.', status)
    case 403:
      return new ApiError('auth', text ?? 'O iFood não autorizou esta operação. Confira as permissões da conexão.', status)
    case 409:
      return new ApiError('validation', text ?? 'Os dados mudaram desde a revisão. Confira e tente de novo.', status)
    case 404:
      return new ApiError('not_found', text ?? 'Recurso não encontrado.', status)
    case 503:
      return new ApiError('unavailable', text ?? 'O serviço de sugestões está indisponível no momento.', status)
    case 504:
      return new ApiError('timeout', text ?? 'O agente excedeu o tempo de execução. Nenhuma compra foi realizada.', status)
    default:
      // Proxy do Vite responde 5xx com corpo vazio quando o backend está fora do ar.
      if (status >= 500 && emptyBody) {
        return new ApiError('network', 'Não foi possível conectar ao serviço. Suas informações continuam nesta tela; tente novamente em instantes.', status)
      }
      if (status >= 500 && !text) {
        return new ApiError('failed', `O serviço encontrou um erro (${status}). Nenhuma compra foi realizada.`, status)
      }
      return new ApiError('failed', text ?? `Erro inesperado (${status}).`, status)
  }
}

export const api = {
  health: () => request<{ status: string }>('/health'),
  authStatus: () => request<{ authenticated: boolean; connection_id?: string }>('/auth/status'),
  sendMessage: (payload: AgentRequest) =>
    request<AgentResponse>(
      '/api/agent/message',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
      AGENT_TIMEOUT_MS,
    ),
  parseImage: (image_data_url: string, message: string) =>
    request<AgentResponse>('/api/context/parse-image', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_data_url, message, language: getLanguage() }),
    }, AGENT_TIMEOUT_MS),
  addresses: () => request<Address[]>('/api/addresses', {}, 30_000),
  cartProposal: (payload: CartProposalRequest) =>
    request<CartProposal>('/api/cart/proposal', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    }),
  // createCart + getCart no MCP; o backend nunca repete a escrita sozinho.
  confirmCart: (proposal: CartProposal) =>
    request<CartResult>('/api/cart/confirm', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposal_id: proposal.id, snapshot_hash: proposal.snapshot_hash, confirm: true }),
    }, 60_000),
  loginUrl: '/auth/login',
}
