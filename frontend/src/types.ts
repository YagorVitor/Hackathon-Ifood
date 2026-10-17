// Espelha backend/app/contracts.py (branch feature/backend, contract_version "1").
// Valores monetários sempre em centavos inteiros.

export type Provenance = 'DECLARED' | 'INFERRED' | 'MCP' | 'ESTIMATED'
export type Strategy = 'USE_WHAT_I_HAVE' | 'COMPLETE_WITH_MARKET' | 'CONVENIENCE'
export type TagsState = 'NOT_ASKED' | 'ASKED' | 'ANSWERED' | 'DECLINED'
export type Preference = 'VEGETARIAN' | 'VEGAN'

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

export interface MealOption {
  titulo: string
  estrategia: Strategy
  usa: string[]
  faltantes: string[]
  justificativa: string
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
  query: string
  restricoes_aplicadas: string[]
  status: 'success' | 'empty' | 'error'
  quantidade_resultados: number
}

export interface AgentOutput {
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
