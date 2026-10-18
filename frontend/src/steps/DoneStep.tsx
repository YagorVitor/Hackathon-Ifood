import { t } from '../accessibility/i18n'
import { SpeakButton } from '../components/SpeakButton'
import { Badge, Button, Card, Notice, StageTitle } from '../components/ui'
import type { MealOption, OptionalComplement } from '../types'
import { OptionalComplements } from '../components/OptionalComplements'
import { IngredientLine, StrategyTag } from './OptionsStep'

export function DoneStep({ option, onBack, onRestart, onComplement, onExplore }: { option: MealOption; onComplement: (complement: OptionalComplement) => void; onExplore: () => void; onBack: () => void; onRestart: () => void }) {
  return (
    <div className="space-y-4">
      <StageTitle kicker={t("Tudo começa com o que você tem")}>{t("Dá para fazer com o que você tem")}</StageTitle>
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <StrategyTag s={option.estrategia} />
          <Badge p="INFERRED" label={t("Opção escolhida")} />
        </div>
        <h3 className="text-xl font-bold">{option.titulo}</h3>
        {option.justificativa && <p className="text-ink-muted">{option.justificativa}</p>}
        <SpeakButton text={`${option.titulo}. ${option.justificativa}. ${option.usa.join(", ")}`} />
        <IngredientLine label={t("Você vai usar")} items={option.usa} tone="have" />
      </Card>
      <Notice tone="success" role="status" title={t("Nenhuma compra necessária")}>{t(" Esta sugestão aproveita os ingredientes que você confirmou. Confira validade e conservação antes de preparar. ")}</Notice>
      <OptionalComplements option={option} onChoose={onComplement} onExplore={onExplore} />
      <div className="space-y-2">
        <Button variant="secondary" icon="back" onClick={onBack}>{t("Voltar às sugestões")}</Button>
        <Button variant="ghost" icon="plus" onClick={onRestart}>{t("Começar uma nova consulta")}</Button>
      </div>
    </div>
  )
}
