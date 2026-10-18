import { useEffect, useRef, useState } from 'react'
import { getLanguage } from '../accessibility/settings'
import { t } from '../accessibility/i18n'
import { speechChunks } from '../accessibility/speech'
import { Icon } from './icons'
import { focusRing } from './styles'

export function SpeakButton({ text }: { text: string }) {
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState(false)
  const generation = useRef(0)
  const ownSpeech = useRef(false)
  const language = getLanguage()
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
  useEffect(() => {
    const stop = () => { generation.current++; if (ownSpeech.current) window.speechSynthesis?.cancel(); ownSpeech.current = false; setPlaying(false) }
    const hidden = () => { if (document.hidden) stop() }
    window.addEventListener('despensa:speech-start', stop)
    document.addEventListener('visibilitychange', hidden)
    return () => { window.removeEventListener('despensa:speech-start', stop); document.removeEventListener('visibilitychange', hidden); generation.current++; if (ownSpeech.current) window.speechSynthesis?.cancel(); ownSpeech.current = false; setPlaying(false) }
  }, [language, text])
  function toggle() {
    if (!supported) return
    const wasPlaying = playing
    window.dispatchEvent(new Event('despensa:speech-start'))
    generation.current++
    const id = generation.current
    window.speechSynthesis.cancel()
    ownSpeech.current = false
    if (wasPlaying) { setPlaying(false); return }
    const chunks = speechChunks(text)
    if (!chunks.length) return
    const lang = language === 'en' ? 'en-US' : 'pt-BR'
    const voice = window.speechSynthesis.getVoices().find(voice => voice.lang.toLowerCase().startsWith(language === 'en' ? 'en' : 'pt'))
    let index = 0
    setError(false)
    setPlaying(true)
    ownSpeech.current = true
    const speak = () => {
      if (generation.current !== id) return
      const utterance = new SpeechSynthesisUtterance(chunks[index])
      utterance.lang = lang
      if (voice) utterance.voice = voice
      utterance.onend = () => {
        if (generation.current !== id) return
        if (++index < chunks.length) speak()
        else { ownSpeech.current = false; setPlaying(false) }
      }
      utterance.onerror = event => {
        if (generation.current !== id) return
        ownSpeech.current = false
        setPlaying(false)
        if (event.error !== 'canceled' && event.error !== 'interrupted') setError(true)
      }
      try { window.speechSynthesis.speak(utterance) } catch { ownSpeech.current = false; setPlaying(false); setError(true) }
    }
    try { speak() } catch { ownSpeech.current = false; setPlaying(false); setError(true) }
  }
  return <div className="speech-control">
    <button type="button" className={`speech-button ${focusRing}`} onClick={toggle} disabled={!supported || !text.trim()} aria-pressed={playing}>
      <Icon name={playing ? 'stop' : 'volume'} className="size-4" />{t(playing ? 'Parar leitura' : 'Ouvir resposta')}
    </button>
    {!supported && <p className="text-xs text-ink-muted">{t('Leitura em voz indisponível neste navegador.')}</p>}
    {error && <p className="text-xs" role="alert">{t('Não foi possível ler em voz alta. O texto continua disponível.')}</p>}
    <span className="sr-only" role="status">{playing ? t('Leitura em andamento.') : ''}</span>
  </div>
}
