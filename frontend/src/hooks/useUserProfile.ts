import { useState } from 'react'
import { emptyTags, hasSensitive, LIMITS } from '../flow'
import type { DeclaredTags, Preference } from '../types'

const KEY = 'despensa-reversa.profile.v1'
interface Profile { tags: DeclaredTags; consent: boolean; remember: boolean }
const fresh = (): Profile => ({ tags: emptyTags(), consent: false, remember: false })
const list = (value: unknown): string[] => Array.isArray(value)
  ? value.filter((v): v is string => typeof v === 'string' && !!v.trim() && v.length <= LIMITS.text).slice(0, LIMITS.tagValues) : []

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw || raw.length > 16000) return fresh()
    const value = JSON.parse(raw)
    if (value?.version !== 1 || value.remember !== true || typeof value.tags !== 'object' || !value.tags) return fresh()
    const consent = value.consent === true
    const preferences: Preference[] = list(value.tags.preferencias).filter((p): p is Preference => ['VEGETARIAN', 'VEGAN', 'ORGANIC'].includes(p))
    const tags: DeclaredTags = {
      preferencias: preferences,
      alergias: consent ? list(value.tags.alergias) : [],
      intolerancias: consent ? list(value.tags.intolerancias) : [],
      condicoes_saude: consent ? list(value.tags.condicoes_saude) : [],
      estado: value.tags.estado === 'DECLINED' ? 'DECLINED' : 'ANSWERED',
    }
    return { tags, consent: consent && hasSensitive(tags), remember: true }
  } catch { return fresh() }
}

export function persistProfile(tags: DeclaredTags, consent: boolean, remember: boolean): { profile: Profile; error: string | null } {
  const cleaned = consent ? tags : { ...tags, alergias: [], intolerancias: [], condicoes_saude: [] }
  const profile = { tags: cleaned, consent: consent && hasSensitive(cleaned), remember }
  try {
    localStorage.removeItem(KEY)
    if (remember) localStorage.setItem(KEY, JSON.stringify({ version: 1, ...profile }))
    return { profile, error: null }
  } catch {
    return { profile: { ...profile, remember: false }, error: 'Não foi possível atualizar o perfil salvo neste navegador. Use as configurações do navegador para limpar os dados do site; nesta aba vale apenas o perfil atual.' }
  }
}

export function useUserProfile() {
  const [profile, setProfile] = useState<Profile>(loadProfile)
  const [storageError, setStorageError] = useState<string | null>(null)
  function save(tags: DeclaredTags, consent: boolean, remember: boolean) {
    const result = persistProfile(tags, consent, remember)
    setStorageError(result.error)
    setProfile(result.profile)
  }
  function forget() { save(emptyTags('DECLINED'), false, false) }
  return { ...profile, save, forget, storageError }
}
