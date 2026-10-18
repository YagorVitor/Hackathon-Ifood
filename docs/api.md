# API e contratos

A API local roda em `http://localhost:8000`. A referência completa, gerada pelos modelos atuais, fica em `/docs`; o schema OpenAPI está em `/openapi.json`.

## Rotas

| Método | Rota | Uso |
|---|---|---|
| GET | `/health`, `/healthz` | Estado do processo |
| GET | `/auth/login`, `/auth/ifood` | Iniciar autorização iFood |
| GET | `/auth/callback` | Receber código e validar tentativa OAuth |
| GET | `/auth/status` | Verificar conexão, renovar token se necessário e retornar `connection_id` |
| GET | `/api/integration/tools`, `/mcp/tools` | Consultar ferramentas anunciadas pelo MCP |
| POST | `/mcp/test-search` | Busca de diagnóstico no iFood Mercado, sem modelo |
| POST | `/api/agent/message`, `/agent/test` | Executar uma rodada do agente |
| POST | `/api/context/parse-image` | Reconhecer alimentos para revisão |
| DELETE | `/api/agent/sessions/{session_id}` | Apagar conversa opcional |
| GET | `/api/addresses` | Consultar endereços da conta |
| POST | `/api/cart/proposal` | Preparar uma proposta local |
| POST | `/api/cart/confirm` | Confirmar criação e conferir resultado |
| GET | `/api/cart/{cart_id}` | Consultar carrinho existente, sem criar outro |

## Mensagem ao agente

```json
{
  "message": "Quero uma ideia de jantar sem comprar.",
  "remember_context": false,
  "context": {
    "inventario_confirmado": [
      {"nome": "arroz", "confirmado": true},
      {"nome": "ovos", "confirmado": true}
    ],
    "tags_declaradas": {"preferencias": ["VEGETARIAN"], "estado": "ANSWERED"},
    "pessoas": 2
  }
}
```

A resposta inclui `response`, `mcpToolCalled`, `tool`, `session_id` e `data`, com a saída estruturada. Campos desconhecidos são rejeitados. Informações sensíveis exigem `consentimento_dados_sensiveis=true`.

`remember_context=true` habilita uma sessão opcional. Sem `context`, uma sessão existente reutiliza o contexto anterior; com `context`, substitui o conteúdo inteiro. Sessões expiradas respondem 404. O frontend usa `remember_context=false` e reenvia o contexto.

## Imagem

O corpo de `/api/context/parse-image` contém `image_data_url`, `message` opcional e `language` (`pt-BR` ou `en`). A imagem deve ser uma data URL base64. A resposta usa `AgentResponse`, sem sessão e sem chamada MCP. O [guia do agente](agente.md) descreve limites e processamento.

## Carrinho

A proposta recebe `merchant_id`, `address_id` e `linhas`, com `item_id` e `quantidade`. Os identificadores devem corresponder a produtos recentes e ao destino usado na busca. A proposta retorna `id` e `snapshot_hash`.

A confirmação recebe:

```json
{
  "proposal_id": "identificador retornado pela proposta",
  "snapshot_hash": "hash retornado pela proposta",
  "confirm": true
}
```

Reutilize os valores retornados pelo backend. A confirmação cria um carrinho real. Resultado incerto bloqueia a repetição automática; carrinho já criado é preservado mesmo quando a conferência falha.

## Erros

| Código | Situação comum |
|---|---|
| 401 / 403 | Autorização ausente, expirada ou insuficiente |
| 404 | Sessão ou recurso não encontrado |
| 409 | Dados, conexão, destino ou proposta precisam de revisão |
| 413 / 415 | Imagem acima do limite ou formato não aceito |
| 422 | Contrato inválido |
| 502 | Falha de modelo, protocolo ou resposta externa |
| 503 | Configuração ou serviço indisponível |
| 504 | Tempo limite excedido |

Os [JSON Schemas](contracts/README.md) complementam esta referência. Os modelos de origem estão em `backend/app/contracts.py` e `backend/app/vision.py`.
