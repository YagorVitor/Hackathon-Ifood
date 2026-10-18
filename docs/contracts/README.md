# Contratos exportados

Estes arquivos são gerados a partir dos modelos do backend. Não os edite manualmente.

| Arquivo | Modelo |
|---|---|
| [agent-request.schema.json](agent-request.schema.json) | AgentRequest |
| [agent-response.schema.json](agent-response.schema.json) | AgentResponse |
| [agent-envelope.schema.json](agent-envelope.schema.json) | AgentEnvelope |
| [agent-output.schema.json](agent-output.schema.json) | AgentOutput |
| [image-request.schema.json](image-request.schema.json) | ImageParseRequest |

Com as dependências do backend instaladas, execute na raiz:

```bash
python backend/scripts/export_contracts.py
```

O OpenAPI em `/openapi.json` inclui também os contratos de carrinho e as demais rotas. Veja a [referência da API](../api.md).
