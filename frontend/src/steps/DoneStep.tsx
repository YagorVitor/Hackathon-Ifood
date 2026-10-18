import { Badge, Button, Card, Notice, StageTitle } from '../components/ui'
import type { MealOption } from '../types'
import { IngredientLine, StrategyTag } from './OptionsStep'

export function DoneStep({ option, onBack, onRestart }: { option: MealOption; onBack: () => void; onRestart: () => void }) {
  return (
    <div className="space-y-4">
      <StageTitle kicker="Tudo começa com o que você tem">Dá para fazer com o que você tem</StageTitle>
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <StrategyTag s={option.estrategia} />
          <Badge p="INFERRED" label="Opção escolhida" />
        </div>
        <h3 className="text-xl font-bold">{option.titulo}</h3>
        {option.justificativa && <p className="text-ink-muted">{option.justificativa}</p>}
        <IngredientLine label="Você vai usar" items={option.usa} tone="have" />
      </Card>
      <Notice tone="success" role="status" title="Nenhuma compra necessária">
        Esta sugestão aproveita os ingredientes que você confirmou. Confira validade e conservação antes de preparar.
      </Notice>
      <div className="space-y-2">
        <Button variant="secondary" icon="back" onClick={onBack}>Voltar às sugestões</Button>
        <Button variant="ghost" icon="plus" onClick={onRestart}>Começar uma nova consulta</Button>
      </div>
    </div>
  )
}
