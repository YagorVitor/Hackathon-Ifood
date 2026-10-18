// Espelha backend/app/contracts.py (branch feature/backend, contract_version "1").
// Valores monetários sempre em centavos inteiros.

export type Provenance = 'DECLARED' | 'INFERRED' | 'MCP' | 'ESTIMATED'
export type Strategy = 'USE_WHAT_I_HAVE' | 'COMPLETE_WITH_MARKET' | 'CONVENIENCE'
export type TagsState = 'NOT_ASKED' | 'ASKED' | 'ANSWERED' | 'DECLINED'
export type Preference = 'VEGETARIAN' | 'VEGAN' | 'ORGANIC'

// Decimal do Pydantic chega como string no JSON.
export type DecimalValue = string | number

export interface Location {
  latitude: number
  longitude: number
}

export interface DeclaredTags {
  preferencias: Preference[]
  alergias: string[]
  intolerancias: string[]
  condicoes_saude: string[]
  estado: TagsState
}

export interface InventoryItem {
  nome: string
  quantidade: DecimalValue | null
  unidade: string | null
  origem: 'DECLARED' | 'INFERRED'
  confirmado: boolean
}

export interface UserContext {
  idioma_resposta?: 'pt-BR' | 'en'
  tags_declaradas: DeclaredTags
  inventario_confirmado: InventoryItem[]
  objetivo: string | null
  pessoas: number | null
  tempo_min: number | null
  orcamento_centavos: number | null
  localizacao: Location | null
  consentimento_dados_sensiveis: boolean
}

export interface AgentRequest {
  message: string
  context: UserContext
  remember_context: false
}

export interface RecognizedIngredient {
  nome: string
  quantidade: DecimalValue | null
  unidade: string | null
  provenance: 'INFERRED'
  confirmado: false
}

export interface OptionalComplement {
  nome: string
  justificativa: string
  provenance: 'INFERRED'
}

export interface MealOption {
  titulo: string
  estrategia: Strategy
  necessidades_quantidade?: { nome: string; quantidade: DecimalValue; unidade: string }[]
  usa: string[]
  faltantes: string[]
  justificativa: string
  complementos_opcionais?: OptionalComplement[]
  provenance: 'INFERRED'
}

export interface SelectedProduct {
  referencia: string
  item_id: string
  merchant_id: string
  nome_observado: string
  loja_observada: string | null
  preco_observado_centavos: number | null
  frete_observado_centavos: number | null
  minimo_pedido_centavos: number | null
  provenance: 'MCP'
  faltante: string
  opcao_indice: number
  quantidade_embalagens: number
  quantidade_provenance: 'INFERRED'
  quantidade_confirmada: false
}

export interface CostSummary {
  opcao_indice: number
  subtotal_conhecido_centavos: number
  taxas_conhecidas_centavos: number
  total_conhecido_centavos: number
  precos_completos: boolean
  fretes_completos: boolean
  total_final: false
  provenance: 'ESTIMATED'
  orcamento_status: 'over' | 'unknown_total' | 'not_applicable'
}

export interface SearchEvidence {
  vertical?: 'RESTAURANT' | 'GROCERIES' | 'LIQUORSTORE' | 'DRUGSTORE' | 'PETSTORE' | 'SHOPPING' | null
  query: string
  restricoes_aplicadas: string[]
  status: 'success' | 'empty' | 'error'
  quantidade_resultados: number
}

export interface RecognizedContext {
  objetivo: string | null
  pessoas: number | null
  tempo_min: number | null
  orcamento_centavos: number | null
  provenance: 'INFERRED'
  confirmado: false
}

export interface AgentOutput {
  contexto_reconhecido?: RecognizedContext
  contract_version: '1'
  mensagem: string
  pergunta_tags: boolean
  ingredientes_reconhecidos: RecognizedIngredient[]
  opcoes: MealOption[]
  produtos: SelectedProduct[]
  limitacoes: string[]
  buscas: SearchEvidence[]
  custos: CostSummary[]
}

export interface AgentResponse {
  response: string
  mcpToolCalled: boolean
  tool: 'searchOffers' | null
  session_id: string | null
  data: AgentOutput
}

export interface McpTool {
  name: string
  description: string | null
}

// Carrinho: rotas /api/addresses e /api/cart/* (backend/app/cart.py).
export interface Address {
  id: string
  rotulo: string | null
  endereco: string | null
  latitude: number | null
  longitude: number | null
  ultimo_usado: boolean
  provenance: 'MCP'
}

export interface CartProposalRequest {
  merchant_id: string
  address_id: string
  linhas: { item_id: string; quantidade: number }[]
}

export interface CartLine {
  item_id: string
  nome: string
  preco_unitario_centavos: number | null
  quantidade: number
  subtotal_centavos: number | null
  quantidade_provenance: 'DECLARED'
  provenance: 'MCP'
}

export interface CartProposal {
  id: string
  merchant_id: string
  loja: string | null
  address_id: string
  linhas: CartLine[]
  subtotal_conhecido_centavos: number
  precos_completos: boolean
  frete_observado_centavos: number | null
  minimo_pedido_centavos: number | null
  snapshot_hash: string
  expira_em_segundos: number
  provenance: 'ESTIMATED'
}

export interface CartResult {
  cart_id: string
  app_deeplink?: string | null
  verificacao?: 'confirmed' | 'unverified' | 'mismatch'
  proposal_id: string
  merchant_id: string
  loja: string | null
  itens: { item_id: string | null; nome: string | null; quantidade: number | null; preco_centavos: number | null }[]
  totais: { subtotal_centavos: number | null; entrega_centavos: number | null; desconto_centavos: number | null; total_centavos: number | null }
  avisos: string[]
  limitacoes: string[]
  pedido_enviado: false
  provenance: 'MCP'
}
