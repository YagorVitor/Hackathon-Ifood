import type { ApiError } from '../api'
import type { ReactNode } from 'react'
import { Icon } from '../components/icons'
import { PantryIllustration } from '../components/PantryIllustration'
import { Button, Loading, Notice, focusRing, inputCls } from '../components/ui'
import { PhotoInput } from '../components/PhotoInput'
import { EXAMPLE_TEXT, LIMITS } from '../flow'

export function CaptureStep({ text, onText, photo, onPhoto, onSubmit, loading, error, connection }: {
  connection: ReactNode
  photo: File | null
  onPhoto: (file: File | null) => void
  text: string
  onText: (v: string) => void
  onSubmit: () => void
  loading: boolean
  error: ApiError | null
}) {
  return (
    <div className="capture-layout">
      <section className="welcome-banner">
        <div className="welcome-copy">
          <p className="eyebrow"><Icon name="sparkle" className="size-4" /> MENOS DESPERDÍCIO, MAIS POSSIBILIDADES</p>
          <h1 id="stage-title" tabIndex={-1}>Tem uma boa refeição<br />na sua <span>despensa.</span></h1>
          <p>Conte o que tem. Seu agente encontra o que preparar e busca no iFood só o que faltar.</p>
        </div>
        <div className="welcome-art"><PantryIllustration /></div>
      </section>

      {connection}

      <form className="capture-form" onSubmit={(e) => { e.preventDefault(); if ((text.trim() || photo) && !loading) onSubmit() }}>
        <div className="capture-heading">
          <span className="section-icon"><Icon name="jar" className="size-5" /></span>
          <div><h2>O que temos para hoje?</h2><p>Escreva, fotografe ou combine os dois. O agente organiza.</p></div>
        </div>
        <label htmlFor="context-text" className="sr-only">Sua despensa e seu objetivo</label>
        <textarea
          id="context-text" rows={4} maxLength={LIMITS.message}
          aria-describedby="context-help context-count"
          className={`${inputCls} context-textarea resize-y`}
          placeholder="Tenho arroz, ovos, tomate e cenoura. Quero um jantar para duas pessoas, em 30 minutos, gastando até R$ 35…"
          value={text} onChange={(e) => onText(e.target.value)} disabled={loading}
        />
        <div className="capture-meta">
          <button type="button" className={`example-button ${focusRing}`} onClick={() => onText(EXAMPLE_TEXT)} disabled={loading}>
            <Icon name="sparkle" className="size-4" /> Experimentar com um exemplo
          </button>
          <span id="context-count" className="text-xs tabular-nums text-ink-muted">{text.length}/{LIMITS.message}</span>
        </div>
        <PhotoInput file={photo} onFile={onPhoto} disabled={loading} />
        {photo && <p className="photo-consent">Ao analisar, esta foto e o texto serão enviados à OpenAI para reconhecer ingredientes. Você confirma os itens antes de continuar.</p>}
        {loading && <Loading label="Organizando sua despensa…" detail="Identificando ingredientes e os detalhes do seu pedido para você conferir." />}
        {error && !loading && <Notice tone="danger" role="alert" title="Não deu para analisar agora">{error.message}</Notice>}
        <div className="capture-actions">
          <p id="context-help"><Icon name="shield" className="size-4" /> Você confere tudo antes de continuar.</p>
          <Button type="submit" icon="sparkle" disabled={!text.trim() && !photo} loading={loading} full={false}>
            {loading ? 'Organizando…' : 'Descobrir o que preparar'}<span aria-hidden="true">→</span>
          </Button>
        </div>
        <details className="capture-privacy"><summary>Sobre seus dados e formas de entrada</summary><p>Texto e foto são enviados ao agente de IA para esta análise. A imagem é processada em memória, sem ser salva pelo app; seus metadados são removidos antes do envio ao modelo. Ingredientes reconhecidos precisam da sua confirmação.</p></details>
      </form>
      <div className="capture-promise"><Icon name="store" className="size-5" /><p>Se faltar algum ingrediente, a gente procura no <b>iFood Mercado.</b><br /><span>Você escolhe a refeição. O agente cuida da busca.</span></p></div>
    </div>
  )
}
