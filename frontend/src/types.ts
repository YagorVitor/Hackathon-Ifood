// Espelha os contratos conceituais de docs/PLANO-BACKEND.md §7 e §9.
export type Provenance = 'DECLARED' | 'INFERRED' | 'MCP' | 'ESTIMATED' | 'EXECUTED' | 'FIXTURE'
export type Strategy = 'USE_WHAT_I_HAVE' | 'COMPLETE_WITH_MARKET' | 'CONVENIENCE'

export interface InventoryItem {
  id: string
  name: string
  provenance: Provenance
  confirmed: boolean
}

export interface UserContext {
  goal: string
  people: number
  timeMin: number
  budgetCents: number
  items: InventoryItem[]
}

export interface Profile {
  preferences: string[] // ex.: VEGETARIAN, VEGAN
  allergies: string[]
  intolerances: string[]
  healthConditions: string[]
  useSensitive: boolean // consentimento
  declined: boolean
}

export interface MealOption {
  id: string
  title: string
  strategy: Strategy
  uses: string[]
  missing: string[]
  timeMin: number
  rationale: string
  warnings: string[]
}

export interface ProductCandidate {
  itemId: string
  merchantId: string
  merchantName: string
  name: string
  forIngredient: string
  priceCents: number
  provenance: Provenance
}

export interface CartResult {
  cartId: string
  subtotalCents: number
  provenance: Provenance
}
