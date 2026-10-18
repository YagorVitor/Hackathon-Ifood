import { useEffect, useSyncExternalStore } from 'react'

export type Language = 'pt-BR' | 'en'
export interface AccessibilitySettings {
  language: Language
  theme: 'system' | 'light' | 'dark'
  textSize: 'normal' | 'large' | 'extra'
  highContrast: boolean
  reduceMotion: boolean
}
export const DEFAULT_SETTINGS: AccessibilitySettings = { language: 'pt-BR', theme: 'system', textSize: 'normal', highContrast: false, reduceMotion: false }
const KEY = 'despensa-reversa.accessibility.v1'
export function parseSettings(raw: string | null): AccessibilitySettings {
  try {
    const value = raw && raw.length < 2000 ? JSON.parse(raw) : null
    return {
      language: value?.language === 'en' ? 'en' : 'pt-BR',
      theme: ['light', 'dark', 'system'].includes(value?.theme) ? value.theme : 'system',
      textSize: ['normal', 'large', 'extra'].includes(value?.textSize) ? value.textSize : 'normal',
      highContrast: value?.highContrast === true,
      reduceMotion: value?.reduceMotion === true,
    }
  } catch { return { ...DEFAULT_SETTINGS } }
}
let current: AccessibilitySettings
try { current = parseSettings(localStorage.getItem(KEY)) } catch { current = { ...DEFAULT_SETTINGS } }
const listeners = new Set<() => void>()
export const getSettings = () => current
export const getLanguage = () => current.language
function apply() {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const dark = current.theme === 'dark' || (current.theme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches)
  root.dataset.theme = dark ? 'dark' : 'light'
  root.dataset.textSize = current.textSize
  root.dataset.contrast = current.highContrast ? 'high' : 'normal'
  root.dataset.motion = current.reduceMotion ? 'reduce' : 'system'
  root.lang = current.language === 'en' ? 'en' : 'pt-BR'
  document.title = current.language === 'en' ? 'Despensa Reversa — your pantry, first' : 'Despensa Reversa — sua despensa, primeiro'
}
export function updateSettings(patch: Partial<AccessibilitySettings>): boolean {
  current = parseSettings(JSON.stringify({ ...current, ...patch }))
  let saved = true
  try { localStorage.setItem(KEY, JSON.stringify(current)) } catch { saved = false }
  apply()
  listeners.forEach(listener => listener())
  return saved
}
export function useAccessibility(manageDocument = false) {
  const settings = useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener) } }, getSettings, () => DEFAULT_SETTINGS)
  useEffect(() => {
    if (!manageDocument) return
    apply()
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onStorage = (event: StorageEvent) => {
      if (event.key !== KEY && event.key !== null) return
      current = parseSettings(event.newValue)
      apply()
      listeners.forEach(listener => listener())
    }
    media.addEventListener('change', apply)
    window.addEventListener('storage', onStorage)
    return () => { media.removeEventListener('change', apply); window.removeEventListener('storage', onStorage) }
  }, [manageDocument])
  return settings
}
