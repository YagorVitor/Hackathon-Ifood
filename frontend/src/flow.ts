import { getLanguage } from './accessibility/settings'
// Regras do lado do cliente: só montam e validam o contexto declarado; nada é inferido aqui.
import type { DeclaredTags, Location, RecognizedContext, RecognizedIngredient, UserContext } from './types'

// Exemplo do fluxo principal em docs/HACKATHON_CONTEXT.md (Etapa 1).
export const EXAMPLE_TEXT =
  'Tenho arroz, ovos, tomate e cenoura. Quero preparar um jantar para duas pessoas, tenho 30 minutos e posso gastar até R$ 35.'

export const LIMITS = { message: 4000, text: 160, items: 80, tagValues: 20 }

export interface DraftItem {
  key: string
  nome: string
  quantidade: string
  unidade: string
  origem: 'DECLARED' | 'INFERRED'
}

export interface DeclaredFields {
  objetivo: string
  pessoas: string
  tempo: string
  orcamento: string
}

export const emptyFields: DeclaredFields = { objetivo: '', pessoas: '', tempo: '', orcamento: '' }

export const emptyTags = (estado: DeclaredTags['estado'] = 'NOT_ASKED'): DeclaredTags => ({
  preferencias: [], alergias: [], intolerancias: [], condicoes_saude: [], estado,
})

export const normalized = (v: string) =>
  v.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ').trim()

export const hasSensitive = (t: DeclaredTags) =>
  t.alergias.length + t.intolerancias.length + t.condicoes_saude.length > 0

let seq = 0
export const newKey = () => `i${++seq}`

export function fromRecognized(list: RecognizedIngredient[]): DraftItem[] {
  const seen = new Set<string>()
  return list.flatMap((r) => {
    const k = normalized(r.nome)
    if (!k || seen.has(k)) return []
    seen.add(k)
    return [{
      key: newKey(), nome: r.nome, origem: 'INFERRED' as const,
      quantidade: r.quantidade == null ? '' : String(r.quantidade), unidade: r.unidade ?? '',
    }]
  })
}

// Aceita "1,5" ou "1.5". Retorna null para vazio e NaN para inválido.
export function parseNumber(raw: string): number | null {
  const s = raw.replace(/r\$|\s/gi, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')
  if (!s) return null
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) : NaN
}

export type FieldErrors = Partial<Record<keyof DeclaredFields, string>>

export function validateFields(f: DeclaredFields): FieldErrors {
  const e: FieldErrors = {}
  const pessoas = parseNumber(f.pessoas)
  if (pessoas !== null && (!Number.isInteger(pessoas) || pessoas < 1 || pessoas > 100)) e.pessoas = 'Use um número inteiro de 1 a 100.'
  const tempo = parseNumber(f.tempo)
  if (tempo !== null && (!Number.isInteger(tempo) || tempo < 1 || tempo > 1440)) e.tempo = 'Use minutos inteiros, de 1 a 1440.'
  const orc = parseNumber(f.orcamento)
  if (orc !== null && (Number.isNaN(orc) || orc > 1_000_000)) e.orcamento = 'Informe um valor em reais, por exemplo 35 ou 35,50.'
  if (f.objetivo.length > LIMITS.text) e.objetivo = `Use até ${LIMITS.text} caracteres.`
  return e
}

export function itemError(i: DraftItem): string | null {
  if (!i.nome.trim()) return 'Informe o nome ou remova o item.'
  if (i.nome.length > LIMITS.text || i.unidade.length > LIMITS.text) return `Use até ${LIMITS.text} caracteres.`
  const q = parseNumber(i.quantidade)
  if (q !== null && (Number.isNaN(q) || q <= 0)) return 'A quantidade deve ser um número maior que zero (ou deixe em branco).'
  return null
}

export function buildContext(opts: {
  items: DraftItem[]
  fields: DeclaredFields
  tags: DeclaredTags
  consent: boolean
  location: Location | null
}): UserContext {
  const { items, fields, tags, consent, location } = opts
  const num = (s: string) => parseNumber(s)
  const orc = num(fields.orcamento)
  return {
    idioma_resposta: getLanguage(),
    // Sem consentimento, nenhum dado sensível sai do navegador (o backend também rejeita).
    tags_declaradas: consent ? tags : { ...tags, alergias: [], intolerancias: [], condicoes_saude: [] },
    consentimento_dados_sensiveis: consent && hasSensitive(tags),
    inventario_confirmado: items.map((i) => {
      const q = num(i.quantidade)
      return {
        nome: i.nome.trim(),
        quantidade: q === null ? null : String(q),
        unidade: i.unidade.trim() || null,
        origem: i.origem,
        confirmado: true,
      }
    }),
    objetivo: fields.objetivo.trim() || null,
    pessoas: num(fields.pessoas),
    tempo_min: num(fields.tempo),
    orcamento_centavos: orc === null ? null : Math.round(orc * 100),
    localizacao: location,
  }
}

// O agente extrai; a pessoa revisa estes campos antes de confirmá-los.
export function fromRecognizedContext(context?: RecognizedContext): DeclaredFields {
  if (!context) return { ...emptyFields }
  return {
    objetivo: context.objetivo ?? '',
    pessoas: context.pessoas == null ? '' : String(context.pessoas),
    tempo: context.tempo_min == null ? '' : String(context.tempo_min),
    orcamento: context.orcamento_centavos == null ? '' : (context.orcamento_centavos / 100).toFixed(2).replace('.', ','),
  }
}
