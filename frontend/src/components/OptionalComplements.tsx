import { t } from '../accessibility/i18n'
import type { MealOption, OptionalComplement } from '../types'
import { Button, Card } from './ui'

export function OptionalComplements({ option, onChoose, onExplore, disabled = false }: {
  option: MealOption
  onChoose: (complement: OptionalComplement) => void
  onExplore: () => void
  disabled?: boolean
}) {
  const complements = option.complementos_opcionais ?? []
  return <Card as="section" className="space-y-3">
    <div>
      <h3 className="text-lg font-bold">{t("Se quiser acompanhar")}</h3>
      <p className="text-sm text-ink-muted">{t("Um extra opcional no iFood. A refeição continua valendo sem ele; preços e disponibilidade só são consultados ao escolher.")}</p>
    </div>
    {complements.length ? <ul className="space-y-3">
      {complements.map((c) => <li key={c.nome} className="rounded-xl border border-line p-3">
        <p className="font-bold">{c.nome}</p>
        <p className="mb-2 text-sm text-ink-muted">{c.justificativa}</p>
        <Button variant="secondary" icon="store" onClick={() => onChoose(c)} disabled={disabled}>{t("Buscar este complemento")}</Button>
      </li>)}
    </ul> : <Button variant="secondary" icon="sparkle" onClick={onExplore} disabled={disabled}>{t("Sugerir um acompanhamento opcional")}</Button>}
  </Card>
}
