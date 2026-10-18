# Estado e integração com a API

## Estado do `App`

Todo o estado vive em `App.tsx`, com `useState`. Não há biblioteca de estado nem
persistência.

| Estado | Tipo | Papel |
|---|---|---|
| `stage` | `Stage` | Etapa atual |
| `text` | `string` | Texto livre da captura |
| `photo` | `File \| null` | Foto escolhida |
| `captureMessage` | `string` | Mensagem do agente na captura |
| `items` | `DraftItem[]` | Ingredientes em revisão |
| `fields` | `DeclaredFields` | Objetivo, pessoas, tempo e orçamento (strings) |
| `tags` | `DeclaredTags` | Preferências e restrições |
| `consent` | `boolean` | Consentimento a dados sensíveis |
| `tagsMode` | `'question' \| 'edit'` | Modo da etapa de tags |
| `plan` | `AgentResponse \| null` | Resposta do planejamento |
| `chosen` | `MealOption \| null` | Opção escolhida |
| `market` | `AgentResponse \| null` | Resposta da busca |
| `location` | `Location \| null` | Coordenadas escolhidas |
| `busy` | `null \| 'capture' \| 'plan' \| 'market'` | Requisição em andamento |
| `error` | `ApiError \| null` | Último erro (limpo a cada troca de etapa) |
| `backend` | `'checking' \| 'up' \| 'down'` | Saúde do backend |
| `auth` | `'checking' \| 'yes' \| 'no' \| 'error'` | Conexão com o iFood |
| `tools` | `McpTool[] \| null` | Ferramentas do MCP (seção técnica) |

`autoSearchAttempted` é um `useRef` que impede a busca automática de se repetir.

### Efeitos

| Efeito | Quando | Faz |
|---|---|---|
| Saúde e login | Ao montar | `GET /health` e `GET /auth/status` |
| Retorno do login | Em `market`, sem login | Reconsulta `/auth/status` em `focus` e `visibilitychange` |
| Ferramentas | Em `market`, com login e `tools === null` | `GET /api/integration/tools` |
| Foco | A cada troca de etapa | Rola ao topo e foca `#stage-title` |
| Busca automática | Em `market`, condições prontas | `consultMarket()` uma vez |

## Cliente HTTP (`api.ts`)

```ts
api.health()            // GET  /health
api.authStatus()        // GET  /auth/status
api.tools()             // GET  /api/integration/tools  (timeout 30 s)
api.sendMessage(body)   // POST /api/agent/message      (timeout 100 s)
api.parseImage(url, m)  // POST /api/context/parse-image (timeout 100 s)
api.loginUrl            // '/auth/login'
```

### `request<T>(path, init, timeoutMs = 15_000)`

- `fetch` com `AbortController` e `credentials: 'same-origin'`.
- O timeout do agente é de **100 s**, um pouco acima dos 90 s do backend.
- Lê o corpo como texto e tenta interpretar como JSON.
- Respostas não-OK viram `ApiError` por `toApiError`.

### Mapeamento de erros

```ts
type ApiErrorKind = 'network' | 'auth' | 'validation' | 'unavailable' | 'timeout' | 'failed' | 'not_found'
```

| Situação | `kind` | Mensagem padrão |
|---|---|---|
| `fetch` falhou | `network` | "Não foi possível conectar ao serviço…" |
| Timeout do navegador | `timeout` | "A resposta demorou demais. Nenhuma compra foi realizada…" |
| `422` com lista de erros | `validation` | "Alguns dados não foram aceitos: {msgs}" (sem o campo `input`, que pode ter dados sensíveis) |
| `413` | `validation` | "A foto deve ter no máximo 5 MB." |
| `415` | `validation` | "Escolha uma imagem JPEG, PNG ou WebP." |
| `401` | `auth` | "Conecte sua conta iFood para continuar." |
| `404` | `not_found` | "Recurso não encontrado." |
| `503` | `unavailable` | "O serviço de sugestões está indisponível no momento." |
| `504` | `timeout` | "O agente excedeu o tempo de execução…" |
| `5xx` com corpo vazio | `network` | Proxy do Vite sem backend |
| `5xx` sem `detail` | `failed` | "O serviço encontrou um erro ({status})…" |

Quando o backend manda `detail` como texto, ele substitui a mensagem padrão.

Efeitos colaterais em `send()`: erro `auth` muda `auth` para `'no'`; erro
`network` muda `backend` para `'down'`.

## Regras do cliente (`flow.ts`)

| Função | Faz |
|---|---|
| `EXAMPLE_TEXT` | Exemplo do botão "Experimentar com um exemplo" |
| `LIMITS` | `message: 4000`, `text: 160`, `items: 80`, `tagValues: 20` |
| `normalized(v)` | Minúsculas, sem acentos, espaços colapsados (igual ao backend) |
| `hasSensitive(tags)` | Há alergias, intolerâncias ou condições? |
| `fromRecognized(list)` | Converte ingredientes reconhecidos em `DraftItem`, sem duplicatas |
| `parseNumber(raw)` | Aceita `1,5`, `1.5`, `1.000`, `R$ 35`; devolve `null` (vazio) ou `NaN` (inválido) |
| `validateFields(f)` | Pessoas 1–100, tempo 1–1440, orçamento até 1.000.000, objetivo até 160 |
| `itemError(i)` | Nome obrigatório e quantidade > 0 |
| `buildContext(opts)` | Monta o `UserContext` enviado ao backend |
| `fromRecognizedContext(c)` | Preenche os campos do pedido a partir de `contexto_reconhecido` |

### `buildContext`

```ts
{
  tags_declaradas: consent ? tags : { ...tags, alergias: [], intolerancias: [], condicoes_saude: [] },
  consentimento_dados_sensiveis: consent && hasSensitive(tags),
  inventario_confirmado: items.map(i => ({ nome, quantidade: String | null, unidade | null, origem, confirmado: true })),
  objetivo: string | null,
  pessoas: number | null,
  tempo_min: number | null,
  orcamento_centavos: Math.round(reais * 100) | null,
  localizacao: location,   // null fora da etapa market
}
```

- Sem consentimento, **nenhum dado sensível sai do navegador**.
- Todos os itens da revisão vão como `confirmado: true`.
- `quantidade` vai como string, para o `Decimal` do backend.
- A localização só é enviada na busca do Mercado.

## Tipos (`types.ts`)

Espelho manual de `backend/app/contracts.py`, com `contract_version: "1"`.
Valores monetários são sempre centavos inteiros, e `Decimal` chega como
`string | number`.

Divergências conhecidas: ver
[Contratos de dados](../02-arquitetura/contratos-de-dados.md#divergências-entre-frontend-e-backend).

## Veja também

- [Referência da API](../03-backend/api-referencia.md)
- [Fluxo de telas](fluxo-de-telas.md)
