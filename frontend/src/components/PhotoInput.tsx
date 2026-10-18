import { t } from '../accessibility/i18n'
import { useEffect, useId, useRef, useState } from 'react'
import { Icon } from './icons'
import { Button, Notice, focusRing } from './ui'

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function PhotoInput({ file, onFile, disabled }: {
  file: File | null
  onFile: (file: File | null) => void
  disabled: boolean
}) {
  const picker = useRef<HTMLInputElement>(null)
  const nativeCamera = useRef<HTMLInputElement>(null)
  const [camera, setCamera] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const id = useId()

  useEffect(() => {
    if (!file) { setPreview(null); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const accept = (selected: File | undefined) => {
    if (!selected) return
    setError(null)
    if (!PHOTO_TYPES.includes(selected.type)) {
      setError('Escolha uma foto JPEG, PNG ou WebP. Converta arquivos HEIC para JPEG antes de enviar.')
      return
    }
    if (selected.size > MAX_PHOTO_BYTES) {
      setError('A foto deve ter no máximo 5 MB. Escolha uma versão menor.')
      return
    }
    if (!selected.size) { setError('O arquivo está vazio. Escolha outra foto.'); return }
    onFile(selected)
  }

  const openCamera = () => {
    setError(null)
    if (typeof navigator.mediaDevices?.getUserMedia === 'function' && window.isSecureContext) setCamera(true)
    else nativeCamera.current?.click()
  }

  return (
    <div className="photo-input">
      <div className="photo-buttons">
        <button type="button" className={`photo-action ${focusRing}`} onClick={openCamera} disabled={disabled}>
          <Icon name="camera" className="size-4" />{t(" Tirar foto ")}</button>
        <label className={`photo-action photo-file-control ${disabled ? 'is-disabled' : ''}`}>
          <Icon name="image" className="size-4" />{t(" Enviar imagem ")}<input ref={picker} type="file" accept="image/jpeg,image/png,image/webp"
            aria-label={t("Enviar imagem")} aria-describedby={`${id}-help`} disabled={disabled}
            onChange={(e) => { accept(e.target.files?.[0]); e.target.value = '' }} />
        </label>
        <span id={`${id}-help`}>{t("JPEG, PNG ou WebP · até 5 MB")}</span>
      </div>
      <input ref={nativeCamera} type="file" accept="image/jpeg,image/png,image/webp" capture="environment"
        className="sr-only" tabIndex={-1} aria-label={t("Fotografar alimentos")} disabled={disabled}
        onChange={(e) => { accept(e.target.files?.[0]); e.target.value = '' }} />
      {file && preview && (
        <figure className="photo-preview">
          <img src={preview} alt={t("Foto dos alimentos escolhida para análise")} onError={() => { onFile(null); setError('Não foi possível abrir essa imagem. Escolha outra foto.') }} />
          <figcaption><b>{t("Foto pronta para analisar")}</b><span>{file.size < 1024 * 1024 ? `${Math.ceil(file.size / 1024)} KB` : `${(file.size / 1024 / 1024).toFixed(1).replace('.', ',')} MB`}{t(" · Você confere os ingredientes depois.")}</span></figcaption>
          <button type="button" onClick={() => onFile(null)} disabled={disabled} aria-label={t("Remover foto")} className={`photo-remove ${focusRing}`}><Icon name="x" className="size-4" /></button>
        </figure>
      )}
      {error && <div className="mt-3"><Notice tone="danger" role="alert">{t(error)}</Notice></div>}
      {camera && <CameraDialog onCapture={(photo) => { accept(photo); setCamera(false) }} onClose={() => setCamera(false)} onUpload={() => { setCamera(false); picker.current?.click() }} />}
    </div>
  )
}

function CameraDialog({ onCapture, onClose, onUpload }: {
  onCapture: (file: File) => void
  onClose: () => void
  onUpload: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const alive = useRef(true)
  const [ready, setReady] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let disposed = false
    alive.current = true
    const stop = () => {
      stream.current?.getTracks().forEach((track) => track.stop())
      stream.current = null
      if (video.current) video.current.srcObject = null
    }
    dialog.current?.showModal()
    void navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then(async (media) => {
        if (disposed || document.hidden) { media.getTracks().forEach((track) => track.stop()); return }
        stream.current = media
        if (video.current) { video.current.srcObject = media; await video.current.play() }
      })
      .catch((err: unknown) => {
        if (disposed) return
        stop()
        const name = err instanceof DOMException ? err.name : ''
        setError(name === 'NotAllowedError' ? 'Acesso à câmera não autorizado. Você pode enviar uma foto salva.'
          : name === 'NotFoundError' ? 'Nenhuma câmera encontrada. Envie uma foto salva.'
            : 'Não foi possível abrir a câmera. Ela pode estar em uso por outro aplicativo.')
      })
    // Sair da aba desliga a câmera; ela não continua capturando em segundo plano.
    const onHidden = () => {
      if (document.hidden) { stop(); setReady(false); setError('A câmera foi desligada ao sair da aba. Feche e abra novamente para fotografar.') }
    }
    document.addEventListener('visibilitychange', onHidden)
    return () => { disposed = true; alive.current = false; stop(); dialog.current?.close(); document.removeEventListener('visibilitychange', onHidden) }
  }, [])

  const takePhoto = () => {
    const source = video.current
    if (!ready || !source?.videoWidth) return
    setCapturing(true)
    const scale = Math.min(1, 2048 / Math.max(source.videoWidth, source.videoHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(source.videoWidth * scale)
    canvas.height = Math.round(source.videoHeight * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) { setCapturing(false); setError('Não foi possível capturar. Envie uma foto salva.'); return }
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((blob) => {
      if (!alive.current) return
      setCapturing(false)
      if (!blob) { setError('Não foi possível capturar a foto. Tente novamente.'); return }
      if (blob.size > MAX_PHOTO_BYTES) { setError('A captura ficou grande demais. Tente uma resolução menor ou envie outra foto.'); return }
      onCapture(new File([blob], 'despensa.jpg', { type: 'image/jpeg' }))
    }, 'image/jpeg', .85)
  }

  return (
    <dialog ref={dialog} className="camera-dialog" aria-labelledby="camera-title" aria-describedby="camera-help" onCancel={(e) => { e.preventDefault(); onClose() }}>
      <div className="camera-heading"><h2 id="camera-title">{t("Mostre sua despensa")}</h2><button type="button" onClick={onClose} aria-label={t("Fechar câmera")} className={`photo-remove ${focusRing}`}><Icon name="x" /></button></div>
      <p id="camera-help">{t("Enquadre os alimentos com boa iluminação. A foto só será enviada quando você pedir a análise.")}</p>
      <div className="camera-view"><video ref={video} autoPlay playsInline muted onLoadedData={() => setReady(true)} /><span>{!ready && !error ? t("Autorize o acesso à câmera no navegador…") : ''}</span></div>
      {error && <Notice tone="warn" role="alert">{t(error)}</Notice>}
      <div className="camera-actions"><Button icon="camera" disabled={!ready || !!error} loading={capturing} onClick={takePhoto}>{t("Capturar foto")}</Button><Button variant="secondary" onClick={onUpload}>{t("Escolher foto salva")}</Button></div>
    </dialog>
  )
}

export function photoDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Falha ao ler a foto.'))
    reader.onerror = () => reject(new Error('Falha ao ler a foto.'))
    reader.onabort = () => reject(new Error('Leitura da foto interrompida.'))
    reader.readAsDataURL(file)
  })
}
