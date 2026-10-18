# Referência da API

Base local: `http://localhost:8000`. O OpenAPI interativo fica em `/docs`.
O frontend acessa tudo pelo proxy do Vite (`/api`, `/auth` e `/health`).

## Resumo

| Método | Rota | Alias | Para quê |
|---|---|---|---|
| `GET` | `/health` | `/healthz` | Liveness |
| `GET` | `/auth/login` | `/auth/ifood` | Inicia o OAuth do consumidor |
| `GET` | `/auth/callback` | — | Recebe o retorno do iFood |
| `GET` | `/auth/status` | — | Diz se há conta conectada |
| `GET` | `/api/integration/tools` | `/mcp/tools` | Lista as ferramentas do MCP nesta sessão |
| `POST` | `/mcp/test-search` | — | Busca direta no MCP, sem LLM (diagnóstico) |
| `POST` | `/api/agent/message` | `/agent/test` | Executa o agente |
| `POST` | `/api/context/parse-image` | — | Reconhece ingredientes numa foto |
| `DELETE` | `/api/agent/sessions/{session_id}` | — | Apaga uma sessão |

---

## `GET /health`

```json
{ "status": "ok" }
```

---

## `GET /auth/login`

Gera `state` e `code_verifier` PKCE e redireciona (`302`) para
`https://id.ifood.com.br/authorize`.

| Código | Quando |
|---|---|
| `302` | Redirecionamento para o iFood |
| `503` | `IFOOD_CLIENT_ID` ou `IFOOD_CLIENT_SECRET` ausentes |

O frontend abre essa rota numa nova aba.

---

## `GET /auth/callback`

Parâmetros de query: `code`, `state` e `error`.

| Código | Quando |
|---|---|
| `200` | HTML "Conta iFood conectada" |
| `400` | `error` presente, `code` ou `state` ausentes, ou `state` inválido/expirado |
| `502` | Falha ao trocar o código por tokens |

---

## `GET /auth/status`

```json
{ "authenticated": true }
```

Indica só se existem tokens em memória. Não testa se ainda são válidos.

---

## `GET /api/integration/tools`

Abre uma conexão MCP e devolve o resultado de `tools/list`.

```json
{
  "endpoint": "https://consumer-mcp.ifood.com.br/marketplace",
  "tools": [
    { "name": "searchOffers", "description": "...", "inputSchema": { "...": "..." } }
  ]
}
```

| Código | Quando |
|---|---|
| `200` | OK |
| `401` | Sem login ou sessão iFood expirada |
| `500` | Credenciais iFood não configuradas (`RuntimeError` não tratado) |
| `502` | Falha no `tools/list` |

---

## `POST /mcp/test-search`

Busca direta no MCP, sem passar pelo modelo. Útil para validar o OAuth, a
localização e os filtros.

```json
{
  "query": "tomate",
  "latitude": -22.0087,
  "longitude": -47.8909,
  "criteria": {
    "restricoes_itens": ["VEGAN"],
    "preco_maximo_item_centavos": 2000,
    "frete_maximo_centavos": null,
    "ordenar_por": "PRICE"
  }
}
```

Resposta: o resultado bruto da ferramenta.

```json
{ "tool": "searchOffers", "isError": false, "result": { "results": [ ... ] } }
```

| Código | Quando |
|---|---|
| `200` | Chamada feita (pode conter `isError: true`) |
| `401` | Sem login |
| `422` | Corpo inválido |
| `502` | `searchOffers` não anunciada, argumentos fora do schema ou falha de transporte |

---

## `POST /api/agent/message`

Executa uma rodada do agente. O corpo é um
[`AgentRequest`](../02-arquitetura/contratos-de-dados.md#agentrequest-corpo-de-post-apiagentmessage)
e a resposta é um
[`AgentResponse`](../02-arquitetura/contratos-de-dados.md#agentresponse).

Exemplo mínimo, sem compra:

```json
{
  "message": "Quero uma ideia de jantar usando o que tenho, sem comprar.",
  "context": {
    "inventario_confirmado": [
      { "nome": "arroz", "confirmado": true },
      { "nome": "ovos", "confirmado": true }
    ],
    "tags_declaradas": { "preferencias": ["VEGETARIAN"], "estado": "ANSWERED" },
    "pessoas": 2,
    "orcamento_centavos": 3500
  }
}
```

### Semântica de sessão

| Situação | Comportamento |
|---|---|
| `remember_context=false` (padrão) | Nada é guardado; `session_id` volta `null` |
| `remember_context=true`, sem `session_id` | Cria uma sessão e devolve `session_id` |
| `remember_context=true`, com `session_id` | Continua a sessão; `404` se não existir ou tiver expirado |
| `context` omitido numa sessão | Reaproveita o contexto anterior |
| `context` informado numa sessão | **Substitui** o contexto inteiro (sem merge) |
| `session_id` com `remember_context=false` | `422` |

### Códigos de resposta

| Código | Quando |
|---|---|
| `200` | Resposta do agente (mesmo com busca vazia ou com falha registrada) |
| `401` | O agente tentou buscar sem login iFood (ou a sessão expirou) |
| `404` | `session_id` inexistente ou expirado |
| `422` | Corpo inválido (ex.: restrição sensível sem consentimento) |
| `502` | O modelo falhou ou devolveu saída inválida |
| `503` | `OPENAI_API_KEY` ausente |
| `504` | O agente passou de 90 s |

Erros de execução não gravam o novo turno nem o novo contexto.

---

## `POST /api/context/parse-image`

Reconhece possíveis ingredientes numa foto e devolve o mesmo `AgentResponse` da
captura por texto, para a pessoa revisar. Não chama o MCP e não cria sessão.

```json
{
  "image_data_url": "data:image/jpeg;base64,/9j/4AAQ...",
  "message": "Jantar para duas pessoas, até R$ 35"
}
```

- `Content-Type` precisa ser `application/json`.
- O corpo é lido em blocos e cortado antes de passar do limite (5 MB de arquivo
  mais folga para o JSON).
- `message` é opcional. Sem ela, `contexto_reconhecido` volta vazio.
- Na resposta, `mcpToolCalled=false`, `tool=null`, `session_id=null`, e os
  ingredientes vêm sem quantidade nem unidade.

| Código | Quando |
|---|---|
| `200` | Análise concluída (a lista pode vir vazia se não houver alimentos reconhecíveis) |
| `413` | Arquivo acima de 5 MB, acima de 20 megapixels ou bomba de descompressão |
| `415` | Corpo que não é JSON, formato fora de JPEG/PNG/WebP, conteúdo diferente do MIME, ou imagem animada |
| `422` | JSON inválido ou imagem corrompida (mensagem genérica, sem ecoar a foto) |
| `502` | Falha do modelo |
| `503` | `OPENAI_API_KEY` ausente |
| `504` | A análise passou de 90 s |

Detalhes do processamento em
[Reconhecimento de imagem](../04-agente/reconhecimento-de-imagem.md).

---

## `DELETE /api/agent/sessions/{session_id}`

```json
{ "deleted": true }
```

| Código | Quando |
|---|---|
| `200` | Sessão apagada |
| `404` | Sessão inexistente |

O CORS do backend só libera `GET` e `POST`. Chamadas `DELETE` vindas do
navegador precisam passar pelo proxy (mesma origem).

## Veja também

- [Contratos de dados](../02-arquitetura/contratos-de-dados.md)
- [Estado e integração do frontend](../05-frontend/estado-e-integracao.md)
- [Solução de problemas](../06-operacao/solucao-de-problemas.md)
