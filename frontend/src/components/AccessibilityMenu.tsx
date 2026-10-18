import { useEffect, useId, useRef, useState } from 'react'
import { DEFAULT_SETTINGS, updateSettings, useAccessibility } from '../accessibility/settings'
import { t } from '../accessibility/i18n'
import { Icon } from './icons'
import { Button, focusRing, inputCls } from './ui'

export function AccessibilityMenu() {
  const settings = useAccessibility()
  const id = useId()
  const details = useRef<HTMLDetailsElement>(null)
  const summary = useRef<HTMLElement>(null)
  const [storageError, setStorageError] = useState(false)
  function update(patch: Parameters<typeof updateSettings>[0]) { setStorageError(!updateSettings(patch)) }
  function close() { if (details.current) details.current.open = false; summary.current?.focus() }
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (details.current?.open && event.target instanceof Node && !details.current.contains(event.target)) details.current.open = false
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [])
  return <details className="accessibility-menu" ref={details} onBlur={event => { if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false }} onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); close() } }}>
    <summary ref={summary} className={`accessibility-trigger ${focusRing}`}><Icon name="settings" className="size-4" />{t('Acessibilidade')}</summary>
    <section className="accessibility-panel" aria-label={t('Preferências de acessibilidade')}>
      <div className="flex items-center justify-between gap-3"><h2 className="font-bold">{t('Do seu jeito')}</h2><button type="button" onClick={close} className={`photo-remove ${focusRing}`} aria-label={t('Fechar preferências')}><Icon name="x" /></button></div>
      <p className="text-sm text-ink-muted">{t('Ajuste a leitura sem perder sua despensa.')}</p>
      <div className="settings-field"><label htmlFor={`${id}-language`}>{t('Idioma da interface e do agente')}</label>
        <select id={`${id}-language`} className={inputCls} value={settings.language} onChange={event => update({ language: event.target.value === 'en' ? 'en' : 'pt-BR' })}>
          <option value="pt-BR" lang="pt-BR">Português</option><option value="en" lang="en">English</option>
        </select>
      </div>
      <div className="settings-field"><label htmlFor={`${id}-theme`}>{t('Aparência')}</label>
        <select id={`${id}-theme`} className={inputCls} value={settings.theme} onChange={event => update({ theme: event.target.value as typeof settings.theme })}>
          <option value="system">{t('Seguir o sistema')}</option><option value="light">{t('Claro')}</option><option value="dark">{t('Escuro')}</option>
        </select>
      </div>
      <div className="settings-field"><label htmlFor={`${id}-text`}>{t('Tamanho do texto')}</label>
        <select id={`${id}-text`} className={inputCls} value={settings.textSize} onChange={event => update({ textSize: event.target.value as typeof settings.textSize })}>
          <option value="normal">{t('Padrão')}</option><option value="large">{t('Grande')}</option><option value="extra">{t('Extra grande')}</option>
        </select>
      </div>
      <label className="settings-check"><input type="checkbox" checked={settings.highContrast} onChange={event => update({ highContrast: event.target.checked })} />{t('Contraste reforçado')}</label>
      <label className="settings-check"><input type="checkbox" checked={settings.reduceMotion} onChange={event => update({ reduceMotion: event.target.checked })} />{t('Reduzir movimento')}</label>
      {storageError && <p className="text-sm" role="alert">{t('Os ajustes valem nesta aba, mas não puderam ser salvos no navegador.')}</p>}
      <Button variant="secondary" onClick={() => update(DEFAULT_SETTINGS)}>{t('Restaurar ajustes')}</Button>
      <p className="text-xs text-ink-muted">{t('Nomes de produtos e lojas permanecem como recebidos do iFood. Respostas anteriores mantêm o idioma em que foram geradas.')}</p>
    </section>
  </details>
}
