import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadProfile, persistProfile } from '../src/hooks/useUserProfile'
import { buildContext, emptyFields, emptyTags } from '../src/flow'
import type { DeclaredTags } from '../src/types'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { DoneStep } from '../src/steps/DoneStep'

function storage() {
  const entries = new Map<string, string>()
  globalThis.localStorage = {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => { entries.set(key, value) },
    removeItem: (key: string) => { entries.delete(key) },
  } as Storage
  return entries
}
const declared = (): DeclaredTags => ({ ...emptyTags('ANSWERED'), preferencias: ['VEGETARIAN'], alergias: ['amendoim'], condicoes_saude: ['diabetes'] })

test('only remembers profile after explicit storage choice', () => {
  const entries = storage()
  persistProfile(declared(), true, false)
  assert.equal(entries.size, 0)
  assert.equal(loadProfile().tags.estado, 'NOT_ASKED')
})
test('remembered profile is reused across requests without repeating sensitive input', () => {
  storage()
  assert.equal(persistProfile(declared(), true, true).error, null)
  const loaded = loadProfile()
  assert.equal(loaded.remember, true)
  for (const objetivo of ['jantar', 'acompanhamento']) {
    const context = buildContext({ items: [], fields: { ...emptyFields, objetivo }, tags: loaded.tags, consent: loaded.consent, location: null })
    assert.deepEqual(context.tags_declaradas.alergias, ['amendoim'])
    assert.deepEqual(context.tags_declaradas.condicoes_saude, ['diabetes'])
    assert.equal(context.consentimento_dados_sensiveis, true)
  }
})
test('revocation removes sensitive fields from saved profile and outgoing context', () => {
  storage()
  persistProfile(declared(), true, true)
  persistProfile(declared(), false, true)
  const loaded = loadProfile()
  assert.deepEqual(loaded.tags.alergias, [])
  assert.deepEqual(loaded.tags.condicoes_saude, [])
  assert.deepEqual(loaded.tags.preferencias, ['VEGETARIAN'])
  assert.equal(loaded.consent, false)
})
test('forgetting profile removes persisted data', () => {
  const entries = storage()
  persistProfile(declared(), true, true)
  persistProfile(emptyTags('DECLINED'), false, false)
  assert.equal(entries.size, 0)
  assert.deepEqual(loadProfile().tags.preferencias, [])
})
test('corrupt, oversized and nonconsensual stored fields are handled safely', () => {
  const entries = storage()
  const key = 'despensa-reversa.profile.v1'
  for (const invalid of ['{', 'x'.repeat(20000), JSON.stringify({ version: 99 })]) {
    entries.set(key, invalid)
    assert.equal(loadProfile().consent, false)
    assert.equal(loadProfile().remember, false)
  }
  entries.set(key, JSON.stringify({ version: 1, remember: true, consent: false, tags: declared() }))
  assert.deepEqual(loadProfile().tags.alergias, [])
})
test('failed persistence does not silently claim profile was saved', () => {
  storage()
  localStorage.setItem = () => { throw new Error('storage unavailable') }
  const result = persistProfile(declared(), true, true)
  assert.equal(result.profile.remember, false)
  assert.ok(result.error)
  assert.equal(loadProfile().remember, false)
})

test('a complete meal still offers an optional complement without creating missing ingredients', () => {
  const option = { titulo: 'Arroz', estrategia: 'USE_WHAT_I_HAVE' as const, usa: ['arroz'], faltantes: [], justificativa: 'Aproveitar a despensa.', provenance: 'INFERRED' as const,
    complementos_opcionais: [{ nome: 'Salada', justificativa: 'Para acompanhar.', provenance: 'INFERRED' as const }] }
  const noop = () => {}
  const html = renderToStaticMarkup(createElement(DoneStep, { option, onBack: noop, onRestart: noop, onComplement: noop, onExplore: noop }))
  assert.ok(html.includes('Nenhuma compra necessária'))
  assert.ok(html.includes('Salada'))
  assert.ok(html.includes('Buscar este complemento'))
  assert.deepEqual(option.faltantes, [])
})
