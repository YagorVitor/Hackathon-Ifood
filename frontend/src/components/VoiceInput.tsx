import { useEffect, useRef, useState } from 'react'
import { getLanguage } from '../accessibility/settings'
import { t } from '../accessibility/i18n'
import { appendTranscript, finalTranscripts, recognitionConstructor } from '../accessibility/speech'
import type { Recognition } from '../accessibility/speech'
import { LIMITS } from '../flow'
import { Icon } from './icons'
import { focusRing } from './styles'

export function VoiceInput({ value, onChange, disabled, onListening }: { value: string; onChange: (text: string) => void; disabled: boolean; onListening: (listening: boolean) => void }) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recognition = useRef<Recognition | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const latest = useRef({ value, onChange, onListening })
  latest.current = { value, onChange, onListening }
  const language = getLanguage()
  const supported = !!recognitionConstructor()
  useEffect(() => {
    setListening(false)
    return () => {
      const active = recognition.current
      recognition.current = null
      if (active) { active.onstart = active.onresult = active.onerror = active.onend = null; active.abort() }
      clearTimeout(timer.current)
      latest.current.onListening(false)
    }
  }, [language, disabled])
  function toggle() {
    if (recognition.current) { recognition.current.stop(); return }
    const Constructor = recognitionConstructor()
    if (!Constructor || disabled) return
    window.speechSynthesis?.cancel()
    const active = new Constructor()
    const committed = new Set<number>()
    let accumulated = latest.current.value
    active.lang = language === 'en' ? 'en-US' : 'pt-BR'
    active.continuous = true
    active.interimResults = false
    const finish = () => {
      if (recognition.current !== active) return
      recognition.current = null
      clearTimeout(timer.current)
      setListening(false)
      latest.current.onListening(false)
    }
    active.onstart = () => { if (recognition.current !== active) return; setListening(true); latest.current.onListening(true) }
    active.onresult = event => {
      if (recognition.current !== active) return
      const words = finalTranscripts(event, committed)
      if (!words) return
      accumulated = appendTranscript(accumulated, words, LIMITS.message)
      latest.current.onChange(accumulated)
      if (accumulated.length >= LIMITS.message) active.stop()
    }
    active.onerror = event => {
      if (recognition.current !== active) return
      if (event.error !== 'aborted') setError(event.error === 'not-allowed' || event.error === 'service-not-allowed'
        ? 'Microfone não autorizado. Você pode digitar seu pedido.'
        : event.error === 'no-speech' ? 'Não reconheci a fala. Tente novamente ou digite.'
          : 'O ditado não está disponível agora. Continue pelo texto.')
      finish()
    }
    active.onend = finish
    recognition.current = active
    setError(null)
    setListening(true)
    latest.current.onListening(true)
    try {
      active.start()
      timer.current = setTimeout(() => active.stop(), 60000)
    } catch { setError('Não foi possível iniciar o microfone. Continue pelo texto.'); finish() }
  }
  useEffect(() => {
    const stopOnHidden = () => { if (document.hidden) recognition.current?.abort() }
    document.addEventListener('visibilitychange', stopOnHidden)
    return () => document.removeEventListener('visibilitychange', stopOnHidden)
  }, [])
  return <div className="voice-input">
    <button type="button" onClick={toggle} disabled={disabled || !supported} aria-pressed={listening}
      className={`photo-action ${listening ? 'is-recording' : ''} ${focusRing}`} aria-describedby="voice-help">
      <Icon name={listening ? 'stop' : 'mic'} className="size-4" />{t(listening ? 'Parar ditado' : 'Ditar meu pedido')}
    </button>
    <p id="voice-help" className="text-xs text-ink-muted">{t(supported ? 'Ao ditar, o navegador pode enviar áudio ao serviço de reconhecimento. Revise o texto antes de analisar.' : 'Ditado indisponível neste navegador. Você pode digitar ou enviar uma foto.')}</p>
    <p className="text-sm" role={error ? 'alert' : 'status'}>{error ? t(error) : listening ? t('Escutando… pare o ditado antes de analisar.') : ''}</p>
  </div>
}
