# 05 — Documento Técnico Resumido

Arquitetura, uso do MCP do iFood e decisões técnicas principais. Detalhes
operacionais em [`backend/README.md`](../../backend/README.md) e
[`frontend/README.md`](../../frontend/README.md); verificação real em
[`docs/IMPLEMENTACAO-AGENTE.md`](../IMPLEMENTACAO-AGENTE.md).

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React + Vite + TypeScript + Tailwind v4 |
| Backend | Python 3.11+ · FastAPI · Pydantic |
| Agente | OpenAI Agents SDK (modelo padrão `gpt-4.1-mini`, configurável por `OPENAI_MODEL`) |
| Integração | MCP oficial do iFood, Streamable HTTP, `https://consumer-mcp.ifood.com.br/marketplace` |
| Autenticação | OAuth 2.0 Authorization Code + PKCE do consumidor (`id.ifood.com.br`), com refresh |

## Arquitetura

Monólito modular em um único processo: o backend guarda o contexto, e o agente é
uma biblioteca stateless que recebe tudo de que precisa em cada execução.

```
frontend (React)
   │  POST /api/agent/message  (contexto completo a cada chamada)
   ▼
backend (FastAPI)
   ├─ main.py             rotas, OAuth callback, erros HTTP
   ├─ contracts.py        contratos Pydantic versionados (AgentEnvelope/AgentOutput)
   ├─ context.py          sessões opt-in em memória (TTL 30 min, até 100 sessões)
   ├─ agent.py            agente único + ferramenta searchOffers (somente leitura)
   ├─ recommendations.py  evidências do MCP, custos em centavos, limitações
   ├─ ifood_mcp.py        cliente MCP, validação por schema, retry de transporte
   └─ oauth.py            PKCE, troca e refresh de tokens
   ▼
MCP oficial do iFood
```

## Uso do MCP

| Item | Como usamos |
|---|---|
| Ferramenta | **`searchOffers`**, a única exposta ao agente |
| Parâmetros | `merchantType=GROCERIES`, `resultKind=ITEM`, `userLocation` escolhida pelo usuário, 5 resultados |
| Filtros | `refinements.itemRestrictions` (VEGETARIAN, VEGAN, ORGANIC, LAC_FREE, GLUTEN_FREE, SUGAR_FREE), `maxItemPrice`, `maxDeliveryFee`, `sort` |
| Escopo OAuth | `mcp.discovery.search.read` |
| Limites | Até 3 buscas distintas por execução, cache local contra repetição, respeitado inclusive em chamadas concorrentes |
| Validação | Argumentos validados contra o **schema anunciado em runtime** antes de `tools/call` |
| Erros | 1 retry só para falha de transporte; erros de schema ou negócio não são repetidos; falha ≠ lista vazia |
| Não usado | Ferramentas de voucher anunciadas no `tools/list` não são expostas; `getItem`/`getMerchant` não foram anunciadas na sessão verificada |

Endpoints de diagnóstico: `GET /mcp/tools` (capacidades desta sessão) e
`POST /mcp/test-search` (busca direta, sem LLM).

## Decisões técnicas principais

1. **Um agente, uma ferramenta.** O problema não justifica orquestração
   multiagente. Menos superfície significa menos comportamento imprevisível.
2. **Somente leitura nesta versão.** Nenhuma operação de escrita no MCP. O agente
   é instruído a não executar carrinho, voucher, checkout ou compra.
3. **O modelo não escreve dados comerciais.** O agente seleciona referências
   locais (`offer_N`); nomes, IDs e preços são preenchidos pelo backend a partir
   dos resultados da execução atual. IDs inventados, referências antigas e
   seleções sem faltante associado são descartados.
4. **Dinheiro em centavos inteiros.** Valores em BRL vindos do MCP são
   convertidos com `Decimal`. Custos são calculados por opção (alternativas não se
   somam), com frete contado uma vez por loja. O total final é sempre marcado
   como não confirmado.
5. **Schema real acima da documentação.** O adaptador segue o schema anunciado
   pelo servidor (`itemRestrictions`), não o nome descrito no guia (`dietary`).
6. **Contexto pertence ao backend.** Sem memória própria do agente e sem sessão
   da OpenAI (`store=False`). A localização vai só para o MCP, nunca para o
   modelo. Tracing do SDK desligado para não exportar contexto sensível.
7. **Consentimento é uma regra de API.** Alergias, intolerâncias e saúde sem
   `consentimento_dados_sensiveis=true` são rejeitadas. Revogar o consentimento
   limpa o histórico imediatamente, mesmo se o modelo falhar.
8. **Restrições não viram garantias.** Alergia a leite não vira `LAC_FREE`, e
   diabetes não vira `SUGAR_FREE`. Filtros são classificação de catálogo, não
   prova de composição.
9. **Credenciais só no backend.** OAuth e chave da OpenAI ficam no `.env`
   (ignorado pelo Git). O log de acesso é desligado para não registrar códigos
   OAuth.

## Segurança e privacidade

- Nenhuma credencial no frontend nem no repositório.
- Perfil só na memória da aba. Sessão no servidor é opt-in, com exclusão
  explícita (`DELETE /api/agent/sessions/{id}`).
- Códigos HTTP distintos por causa: 401 (sem OAuth iFood), 502 (falha de
  modelo/saída), 503 (sem chave OpenAI), 504 (timeout).

## Qualidade e testes

- **20 testes automatizados** (`backend/tests/test_agent.py`): contratos,
  consentimento e revogação, sessões, orçamento, procedência comercial, schema
  MCP, ferramentas e API. Usam modelo e transporte substituídos e produtos
  sintéticos.
- Schema real de `searchOffers` salvo como fixture
  (`backend/tests/fixtures/search_offers_schema.json`), sem dados pessoais.
- Contratos exportados como JSON Schema em `docs/contracts/`.
- **Verificação real em 17/10/2026:** OAuth autenticado, `tools/list` real e
  fluxo HTTP → agente OpenAI → `searchOffers` real com resposta HTTP 200 e
  `mcpToolCalled=true`. O teste usou coordenadas fictícias e retornou lista vazia
  corretamente, sem produto inventado. Ainda falta validar com uma localização
  real e produtos disponíveis.

## Limitações conhecidas

| Limitação | Impacto | Próximo passo |
|---|---|---|
| **Sem carrinho nem pedido** | O fluxo para na lista de produtos; não fecha o carrinho | `createCart` → `getCart` → revisão → confirmação → `submitOrder`, com escopos de carrinho |
| **Endpoint de foto ausente** | O frontend chama `POST /api/context/parse-image`, que não existe no backend | Implementar o endpoint (validação, remoção de metadados, redimensionamento) ou ocultar a foto na demo |
| Um usuário por vez | Tokens OAuth globais em memória | Sessão por cookie e isolamento multiusuário |
| Sem persistência | Perfil e sessões somem ao reiniciar | Perfil persistente com consentimento por finalidade |
| Sem revalidação de preço | Preço é o observado na busca | `getItem`/`getMerchant` quando disponíveis no escopo |
