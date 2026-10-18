# Design e acessibilidade

## Tokens de cor

Definidos em `src/index.css` como variáveis CSS e expostos ao Tailwind por
`@theme inline` (ex.: `bg-herb`, `text-ink-muted`).

| Token | Valor | Uso |
|---|---|---|
| `--paper` | `#fafafa` | Fundo da página |
| `--surface` | `#fff` | Cards e campos |
| `--surface-2` | `#f5f5f5` | Superfícies secundárias |
| `--ink` | `#292929` | Texto principal |
| `--ink-muted` | `#666` | Texto secundário |
| `--line` | `#e8e8e8` | Bordas |
| `--herb` / `--on-herb` | `#c91e2d` / `#fff` | Cor de ação principal (vermelho) e texto sobre ela |
| `--herb-soft` | `#fff0f1` | Fundo suave da cor principal |
| `--tomato` / `--tomato-soft` | `#c91e2d` / `#fff0f1` | Dados do MCP, faltantes, erros |
| `--amber` / `--amber-soft` | `#865715` / `#fff8e9` | Estimativas e alertas |
| `--violet` / `--violet-soft` | `#65536f` / `#f5f2f7` | Conteúdo gerado pela IA |
| `--blue` / `--blue-soft` | `#4e6274` / `#f0f4f7` | Dados declarados e informações |

> O nome `herb` é herança de uma paleta anterior (verde). Hoje ele é o vermelho
> de destaque, inspirado no iFood, igual a `tomato`. A meta `theme-color` do
> `index.html` usa `#ea1d2c`.

## Tipografia

- **Inter** (pesos 400 a 800) via Google Fonts, com fallback para
  `ui-sans-serif`, `system-ui` e `Segoe UI`. Sem rede, a interface usa as fontes
  do sistema.
- Títulos com `letter-spacing: -.035em` e `text-wrap: balance`.
- Corpo com `line-height: 1.55`.
- Números monetários com `tabular-nums`.

## Linguagem visual da procedência

| Procedência | Rótulo | Ícone | Cor |
|---|---|---|---|
| `DECLARED` | Você informou | `user` | Azul |
| `INFERRED` | Sugerido pela IA | `sparkle` | Violeta |
| `MCP` | Dado do iFood (MCP) | `store` | Vermelho |
| `ESTIMATED` | Estimativa | `approx` | Âmbar |

Cada selo combina **ícone e texto**; nunca depende só da cor.

### Estratégias

| Estratégia | Rótulo | Ícone | Cor |
|---|---|---|---|
| `USE_WHAT_I_HAVE` | Aproveitar o que tenho | `leaf` | Verde |
| `COMPLETE_WITH_MARKET` | Completar no Mercado | `store` | Vermelho |
| `CONVENIENCE` | Conveniência | `bowl` | Âmbar |

## Layout

- Cabeçalho com marca, links e pílula de conexão.
- Barra de progresso de três passos.
- Área principal (`main#conteudo`) e barra lateral "Sua despensa, primeiro."
  com os ingredientes e os fatos do pedido.
- Rodapé expansível "Como funciona e de onde vêm os dados?".
- Responsivo, com `viewport-fit=cover` para telas com entalhe.

## Acessibilidade

| Prática | Onde |
|---|---|
| `lang="pt-BR"` | `index.html` |
| Link "Pular para o conteúdo" | `App.tsx` (`.skip-link` → `#conteudo`) |
| Foco no título a cada etapa | `#stage-title` com `tabIndex={-1}`, focado após a troca |
| Passo atual anunciado | `aria-current="step"` na barra de progresso |
| Anel de foco visível | `focusRing` em botões, links e campos |
| Erros associados aos campos | `aria-invalid` + `aria-describedby` |
| Rótulos em todos os campos | `<label>` visível ou `sr-only` |
| Mensagens dinâmicas | `role="status"` (carregamento, sucesso) e `role="alert"` (erros) |
| Alternâncias | `Chip` com `aria-pressed` |
| Botões ocupados | `aria-busy` durante o carregamento |
| Alvos de toque | `min-h-11` (44 px) e `min-h-12` (48 px) |
| Movimento reduzido | Spinner só gira com `motion-safe` |
| Câmera | `<dialog>` com `aria-labelledby` e `aria-describedby`; Esc fecha |
| Imagem de prévia | `alt` descritivo |
| Ícones decorativos | Texto ao lado; setas com `aria-hidden` |
| Estado por texto | Passos com "(pronto)"/"(pendente)" em `sr-only` |

## Tom de voz

- Frases curtas e diretas, na segunda pessoa ("Conte o que tem").
- Honestidade sobre limites ("Nada foi adicionado a um carrinho").
- Falhas explicam o que aconteceu e o que fazer ("Isso é uma falha de consulta,
  não um catálogo vazio").
- Sem jargão técnico na interface; os detalhes técnicos ficam em seções
  expansíveis.

## Veja também

- [Componentes](componentes.md)
- [Racional da Experiência](../../entregaveis/03-racional-experiencia.md)
