import { t } from '../accessibility/i18n'
import type { AuthState } from '../hooks/useIfoodConnection'
import { Icon } from './icons'
import { Button } from './ui'

export function IfoodConnection({ auth, waiting, disabled, onConnect, onRecheck }: {
  auth: AuthState
  waiting: boolean
  disabled: boolean
  onConnect: () => void
  onRecheck: () => void
}) {
  if (auth === 'yes') return (
    <section className="ifood-connection is-connected" aria-label={t("Conexão com o iFood")}>
      <span className="section-icon"><Icon name="check" className="size-5" /></span>
      <div role="status"><h2>{t("Conta iFood conectada")}</h2><p>{t("Quando você escolher uma refeição, o agente poderá buscar o que faltar.")}</p></div>
    </section>
  )

  return (
    <section className="ifood-connection" aria-labelledby="ifood-connect-title">
      <span className="section-icon"><Icon name="plug" className="size-5" /></span>
      <div className="ifood-connection-copy">
        <h2 id="ifood-connect-title">{t("Conecte o iFood desde já")}</h2>
        <p>{t("Deixe sua conta pronta para buscar os ingredientes que faltarem. Você também pode começar sem conectar.")}</p>
        <p className="ifood-connection-status" role="status">
          {waiting ? t("Conclua o login na outra aba e volte aqui. A conexão será reconhecida automaticamente.")
            : auth === 'error' ? t("Não conseguimos verificar a conexão. Tente verificar novamente.")
              : auth === 'checking' ? t("Verificando conexão…")
                : t("O login acontece no iFood, em uma nova aba. Seu pedido continua nesta página.")}
        </p>
      </div>
      <div className="ifood-connection-actions">
        <Button full={false} icon="external" onClick={onConnect} disabled={disabled || auth === 'checking'}>
          {waiting ? t("Abrir login novamente") : t("Conectar conta iFood")}
        </Button>
        {(waiting || auth === 'error') && <Button variant="ghost" full={false} icon="refresh" onClick={onRecheck}>{t("Verificar conexão")}</Button>}
      </div>
    </section>
  )
}
