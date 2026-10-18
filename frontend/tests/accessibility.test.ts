import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { DEFAULT_SETTINGS, getSettings, parseSettings, updateSettings } from '../src/accessibility/settings'
import { t } from '../src/accessibility/i18n'
import { appendTranscript, finalTranscripts, recognitionConstructor, speechChunks } from '../src/accessibility/speech'
import { CaptureStep } from '../src/steps/CaptureStep'
import { ReviewStep } from '../src/steps/ReviewStep'
import { OptionsStep } from '../src/steps/OptionsStep'
import { SpeakButton } from '../src/components/SpeakButton'
import { buildContext, emptyFields, emptyTags } from '../src/flow'

test('malformed or unknown preferences cannot become DOM settings', () => {
  for (const raw of [null, '{', 'null', '[]', 'x'.repeat(2001)]) assert.deepEqual(parseSettings(raw), DEFAULT_SETTINGS)
  assert.deepEqual(parseSettings('{"theme":"url(x)","textSize":"900","language":"fr","highContrast":"true","reduceMotion":1}'), DEFAULT_SETTINGS)
  assert.equal(parseSettings('{"theme":"dark","highContrast":true}').theme, 'dark')
})
test('visual settings persist without food, health, OAuth or microphone data', () => {
  const entries = new Map<string, string>()
  globalThis.localStorage = { setItem: (k: string, v: string) => entries.set(k, v) } as Storage
  assert.equal(updateSettings({ theme: 'dark', textSize: 'extra', reduceMotion: true }), true)
  const stored = JSON.parse([...entries.values()][0])
  assert.deepEqual(Object.keys(stored).sort(), ['highContrast', 'language', 'reduceMotion', 'textSize', 'theme'])
  assert.equal(stored.reduceMotion, true)
  globalThis.localStorage = { setItem: () => { throw Error('blocked') } } as unknown as Storage
  assert.equal(updateSettings({ theme: 'light' }), false)
  assert.equal(getSettings().theme, 'light')
  updateSettings(DEFAULT_SETTINGS)
})
test('dictation commits only final results once, including repeated events', () => {
  const committed = new Set<number>()
  const event = { resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'arroz' } }, { isFinal: false, 0: { transcript: 'ovos' } }] }
  assert.equal(finalTranscripts(event, committed), 'arroz')
  assert.equal(finalTranscripts(event, committed), '')
  event.results[1].isFinal = true
  assert.equal(finalTranscripts(event, committed), 'ovos')
})
test('dictation preserves typed text and respects the request limit', () => {
  assert.equal(appendTranscript('Tenho arroz ', ' e ovos ', 4000), 'Tenho arroz e ovos')
  assert.equal(appendTranscript('x'.repeat(3995), 'long transcript', 4000).length, 4000)
  assert.equal(recognitionConstructor(), undefined)
})
test('read-aloud chunks long text without losing words or exceeding the limit', () => {
  const text = 'arroz ovos tomate '.repeat(100)
  const chunks = speechChunks(text)
  assert.ok(chunks.length > 1)
  assert.ok(chunks.every(part => part.length <= 240))
  assert.equal(chunks.join(' '), text.trim())
  assert.equal(speechChunks('').length, 0)
  assert.ok(speechChunks('x'.repeat(600)).every(part => part.length <= 240))
})
test('unsupported speech keeps accessible text and a disabled control', () => {
  const html = renderToStaticMarkup(createElement(SpeakButton, { text: 'Confira os ingredientes.' }))
  assert.match(html, /disabled=""/)
  assert.match(html, /Leitura em voz indisponível/)
  assert.match(html, /aria-pressed="false"/)
})
test('English capture is translated, retains text input and has no autoplay', () => {
  updateSettings({ language: 'en' })
  const html = renderToStaticMarkup(createElement(CaptureStep, { text: '', onText() {}, photo: null, onPhoto() {}, onSubmit() {}, loading: false, error: null, connection: null }))
  assert.match(html, /Find something to prepare/)
  assert.match(html, /Dictate my request/)
  assert.match(html, /Dictation is unavailable/)
  assert.match(html, /<label for="context-text"/)
  assert.doesNotMatch(html, /Descobrir o que preparar|autoplay/)
  const context = buildContext({ items: [], fields: emptyFields, tags: emptyTags(), consent: false, location: null })
  assert.equal(context.idioma_resposta, 'en')
  assert.equal(t('Remover {item}', { item: 'Produto Original' }), 'Remove Produto Original')
  assert.equal(t('Produto Original'), 'Produto Original')
  updateSettings(DEFAULT_SETTINGS)
})
test('English suggestion headers translate while commercial names stay untouched', () => {
  updateSettings({ language: 'en' })
  const html = renderToStaticMarkup(createElement(OptionsStep, { message: 'Your meal.', options: [{ titulo: 'Arroz Original', estrategia: 'USE_WHAT_I_HAVE', usa: ['Produto Original'], faltantes: [], justificativa: 'Use it.', provenance: 'INFERRED' }], limitations: [], onChoose() {}, onEditItems() {}, onEditTags() {}, onRetry() {}, loading: false, error: null }))
  assert.match(html, /Use what I have/)
  assert.match(html, /Choose this meal/)
  assert.match(html, /Arroz Original/)
  assert.match(html, /Produto Original/)
  updateSettings(DEFAULT_SETTINGS)
})
function luminance(hex: string) {
  const rgb = hex.slice(1).match(/.{2}/g)!.map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722
}
test('normal text and semantic text meet 4.5:1 contrast in both base themes', () => {
  const css = readFileSync('src/index.css', 'utf8')
  const base = css.match(/:root \{([\s\S]*?)\}/)![1]
  const dark = css.match(/:root\[data-theme="dark"\] \{([\s\S]*?)\}/)![1]
  const parse = (block: string) => Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[\da-f]{3,6});/gi)].map(([, key, value]) => [key, value.length === 4 ? '#' + [...value.slice(1)].map(c => c + c).join('') : value]))
  for (const palette of [parse(base), { ...parse(base), ...parse(dark) }]) {
    for (const [fg, bg] of [['ink', 'surface'], ['ink-muted', 'surface-2'], ['herb', 'herb-soft'], ['tomato', 'tomato-soft'], ['amber', 'amber-soft'], ['violet', 'violet-soft'], ['blue', 'blue-soft'], ['success', 'success-soft'], ['on-herb', 'herb']]) {
      const a = luminance(palette[fg]), b = luminance(palette[bg])
      const contrast = (Math.max(a, b) + .05) / (Math.min(a, b) + .05)
      assert.ok(contrast >= 4.5, `${fg}/${bg}: ${contrast}`)
    }
  }
})

test('review translates inferred ingredient guidance and people summary', () => {
  updateSettings({ language: 'en' })
  const html = renderToStaticMarkup(createElement(ReviewStep, { photoBased: false, text: 'rice', agentMessage: '', items: [{ key: 'rice', nome: 'rice', quantidade: '', unidade: '', origem: 'INFERRED' }], onItems() {}, fields: { ...emptyFields, pessoas: '2' }, onFields() {}, onConfirm() {}, onEditText() {}, loading: false, error: null, onProfile() {} }))
  assert.match(html, /Recognised by AI. Check the names/)
  assert.match(html, /2 people/)
  assert.doesNotMatch(html, /2 pessoas|Reconhecidos pela IA/)
  updateSettings(DEFAULT_SETTINGS)
})
