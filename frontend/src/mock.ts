// DADOS SIMULADOS (provenance FIXTURE). Serão substituídos pela API real do backend.
import type { CartResult, MealOption, ProductCandidate, UserContext, Profile } from './types'

export const EXAMPLE_TEXT =
  'Tenho arroz, ovos, tomate e cenoura. Quero preparar um jantar para duas pessoas, tenho 30 minutos e posso gastar até R$ 35.'

const wait = (ms = 700) => new Promise((r) => setTimeout(r, ms))

export async function parseContext(_text: string): Promise<UserContext> {
  await wait()
  return {
    goal: 'jantar',
    people: 2,
    timeMin: 30,
    budgetCents: 3500,
    items: ['arroz', 'ovos', 'tomate', 'cenoura'].map((name) => ({
      id: name,
      name,
      provenance: 'INFERRED',
      confirmed: false,
    })),
  }
}

export async function planMeals(_ctx: UserContext, profile: Profile): Promise<MealOption[]> {
  await wait()
  const veg = profile.preferences.includes('VEGETARIAN') || profile.preferences.includes('VEGAN')
  return [
    {
      id: 'a',
      title: 'Arroz com ovo mexido e legumes',
      strategy: 'USE_WHAT_I_HAVE',
      uses: ['arroz', 'ovos', 'tomate', 'cenoura'],
      missing: [],
      timeMin: 25,
      rationale: 'Usa tudo o que você já tem, sem precisar comprar.',
      warnings: [],
    },
    {
      id: 'b',
      title: veg ? 'Risoto simples de legumes' : 'Omelete de legumes com arroz',
      strategy: 'COMPLETE_WITH_MARKET',
      uses: ['arroz', 'ovos', 'tomate', 'cenoura'],
      missing: ['cebola', 'queijo ralado'],
      timeMin: 30,
      rationale: 'Aproveita seus ingredientes e completa com 2 itens do Mercado.',
      warnings: ['Ausência de dados de alérgenos não significa que o produto é seguro.'],
    },
    {
      id: 'c',
      title: 'Macarrão instantâneo com ovo',
      strategy: 'CONVENIENCE',
      uses: ['ovos'],
      missing: ['macarrão instantâneo'],
      timeMin: 10,
      rationale: 'Opção rápida, quando há pouco tempo.',
      warnings: [],
    },
  ]
}

export async function searchProducts(option: MealOption): Promise<ProductCandidate[]> {
  await wait(900)
  const catalog: Record<string, ProductCandidate> = {
    cebola: {
      itemId: 'fx-1', merchantId: 'fx-m1', merchantName: 'Mercado Exemplo', name: 'Cebola (kg)',
      forIngredient: 'cebola', priceCents: 599, provenance: 'FIXTURE',
    },
    'queijo ralado': {
      itemId: 'fx-2', merchantId: 'fx-m1', merchantName: 'Mercado Exemplo', name: 'Queijo ralado 50g',
      forIngredient: 'queijo ralado', priceCents: 649, provenance: 'FIXTURE',
    },
    'macarrão instantâneo': {
      itemId: 'fx-3', merchantId: 'fx-m1', merchantName: 'Mercado Exemplo', name: 'Macarrão instantâneo 85g',
      forIngredient: 'macarrão instantâneo', priceCents: 289, provenance: 'FIXTURE',
    },
  }
  return option.missing.map((m) => catalog[m]).filter(Boolean)
}

export async function confirmCart(products: ProductCandidate[]): Promise<CartResult> {
  await wait(900)
  return {
    cartId: 'fixture-cart-001',
    subtotalCents: products.reduce((s, p) => s + p.priceCents, 0),
    provenance: 'FIXTURE',
  }
}
