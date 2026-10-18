# Componentes

## Etapas (`src/steps/`)

| Componente | Props principais | Mostra |
|---|---|---|
| `CaptureStep` | `text`, `photo`, `onSubmit`, `loading`, `error` | Banner, textarea, exemplo, `PhotoInput`, aviso de envio à OpenAI, privacidade |
| `ReviewStep` | `items`, `fields`, `tags`, `consent`, `photoBased`, `onConfirm` | Pedido original, interpretação do agente, ingredientes editáveis, "Seu pedido", preferências |
| `TagsStep` | `mode`, `tags`, `consent`, `onSubmit`, `onDecline`, `onCancel` | Pergunta do agente (modo `question`) e `PreferenceFields` |
| `OptionsStep` | `message`, `options`, `limitations`, `tags`, `onChoose` | Barra de perfil, cards das opções, limitações |
| `MarketStep` | `option`, `auth`, `location`, `result`, `budgetCents`, `tools` | Opção escolhida, conta, localização, resultado, detalhes técnicos |
| `DoneStep` | `option`, `onBack`, `onRestart` | Opção escolhida e "Nenhuma compra necessária" |

### Subcomponentes exportados ou internos

| Componente | Arquivo | Papel |
|---|---|---|
| `PreferenceFields` | `TagsStep.tsx` | Chips de preferência e bloco de dados sensíveis com consentimento (também usado na revisão) |
| `TagList` | `TagsStep.tsx` | Lista editável de alergias, intolerâncias ou condições, com sugestões |
| `StrategyTag` | `OptionsStep.tsx` | Selo colorido da estratégia |
| `IngredientLine` | `OptionsStep.tsx` | Linha de chips "Você já tem" ou "Falta" |
| `LocationPicker` | `MarketStep.tsx` | GPS ou coordenadas manuais |
| `MarketResult` | `MarketStep.tsx` | Avisos de status, produtos por faltante, custos e consultas |
| `ProductRow` | `MarketStep.tsx` | Produto observado com selos MCP e IA |
| `CostCard` | `MarketStep.tsx` | Subtotal, frete, total conhecido e avisos de orçamento |
| `ConnectionPill` | `App.tsx` | Estado do backend e da conta iFood |

### Avisos do `MarketResult`

| Condição | Aviso |
|---|---|
| `mcpToolCalled=false` | "O iFood não foi consultado nesta resposta" |
| Todas as buscas com erro | "A consulta ao iFood falhou" (falha, não catálogo vazio) |
| Parte com erro | "Parte das consultas falhou" |
| Todas vazias | "Nenhum produto encontrado" |
| Houve sucesso, mas nada selecionado | "Nenhum produto selecionado" |

## Componentes de UI (`src/components/ui.tsx`)

| Componente | Uso |
|---|---|
| `PROVENANCE` | Mapa de procedência → rótulo, dica, ícone e cores |
| `Badge` | Selo de procedência (ícone + texto) |
| `Card` | Contêiner arredondado (`div`, `section`, `article` ou `li`) |
| `Button` | Variantes `primary`, `secondary` e `ghost`; `loading` mostra spinner e desabilita; altura mínima de 48 px |
| `Chip` | Botão de alternância com `aria-pressed` |
| `Spinner` | Ícone girando (só com `motion-safe`) |
| `Notice` | Caixa de aviso `info`, `warn`, `danger` ou `success`, com `role` opcional |
| `Loading` | Estado de carregamento com `role="status"` |
| `AgentNote` | Mensagem do agente com selo "Mensagem do agente" |
| `Limitations` | Lista de limitações em `Notice` de alerta |
| `StageTitle` | Título da etapa (`#stage-title`, focável) |
| `focusRing` | Classes do anel de foco visível |
| `inputCls` | Classes padrão de campos, com borda vermelha em `aria-invalid` |
| `brl(cents)` | Formata centavos como `R$ 0,00` |

## `PhotoInput` (`src/components/PhotoInput.tsx`)

| Recurso | Comportamento |
|---|---|
| Tipos aceitos | `image/jpeg`, `image/png`, `image/webp` (HEIC recusado com orientação) |
| Tamanho | Até 5 MB (`MAX_PHOTO_BYTES`); arquivo vazio é recusado |
| "Tirar foto" | Abre `CameraDialog` se houver `getUserMedia` e contexto seguro; senão, o seletor nativo com `capture="environment"` |
| Prévia | `URL.createObjectURL`, revogada ao trocar ou remover |
| Remover | Botão com `aria-label="Remover foto"` |

### `CameraDialog`

- `<dialog>` modal com `showModal()`.
- Pede a câmera traseira (`facingMode: environment`, ideal 1920×1080, sem áudio).
- Captura num `canvas` com lado máximo de **2048 px** e gera JPEG com qualidade
  0,85.
- **Desliga a câmera** ao fechar, capturar, sair da aba (`visibilitychange`) ou
  desmontar.
- Erros tratados: permissão negada, câmera ausente e câmera em uso.

### `photoDataUrl(file)`

Lê o arquivo como data URL (`FileReader.readAsDataURL`) para enviar ao backend.

O envio vai para `POST /api/context/parse-image`, que valida a imagem de novo no
backend, remove metadados e reconhece os ingredientes. Ver
[Reconhecimento de imagem](../04-agente/reconhecimento-de-imagem.md).

## Ícones (`src/components/icons.tsx`)

SVGs inline com traço de 2 px no estilo Lucide, sem dependência externa. O tipo
`IconName` lista os nomes disponíveis (`camera`, `image`, `jar`, `check`, `store`,
`leaf`, `shield`, `sparkle`, `user`, `approx`, `pin`, etc.).

## Veja também

- [Design e acessibilidade](design-e-acessibilidade.md)
- [Fluxo de telas](fluxo-de-telas.md)
