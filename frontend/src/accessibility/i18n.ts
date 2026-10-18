import { getLanguage } from './settings'
import { en } from './translations'
export function t(text: string, values: Record<string, string | number> = {}): string {
  const key = text.trim().replace(/\s+/g, ' ')
  const translated = getLanguage() === 'en' ? en[key] ?? key : key
  const result = translated.replace(/\{(\w+)\}/g, (match, name: string) => String(values[name] ?? match))
  return `${/^\s/.test(text) ? ' ' : ''}${result}${/\s$/.test(text) ? ' ' : ''}`
}
