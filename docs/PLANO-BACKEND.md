# PLANO DO BACK-END — Despensa Reversa

**Branch:** `feature/backend` · **Escopo:** somente back-end (FastAPI + Pydantic + OAuth + adapter MCP iFood + regras + contrato com o agente) · **Data:** 17/10/2026, ~18h (Brasília)

> **Fora do escopo deste plano:** o agente de IA (prompts, LLM, SDK, visão) é desenvolvido em paralelo por outra pessoa, em outro ambiente. O back-end apenas define e consome o **contrato de integração** (seção 10) e funciona de forma independente com um stub até a integração.

Referências: [HACKATHON_CONTEXT.md](HACKATHON_CONTEXT.md) (produto) e [RESUMO-GERAL-DO-SISTEMA.md](RESUMO-GERAL-DO-SISTEMA.md) (diagnóstico). Este documento é **planejamento**; nenhum código foi escrito ainda.

> Princípio: **a IA interpreta, planeja e explica. O backend valida, calcula e controla. O MCP fornece as capacidades comerciais.**

---

## 0. Fatos verificados agora (17/10, ~17h55, sem token)

Coletados por requisições públicas, não por documentação:

| Item | Valor observado |
|---|---|
| Gateway MCP | `https://consumer-mcp.ifood.com.br/marketplace` → `POST initialize` sem token = **HTTP 401** com `WWW-Authenticate: Bearer error="invalid_token", resource_metadata="…"` |
| Protected Resource Metadata | `GET /.well-known/oauth-protected-resource/marketplace` → `resource=https://consumer-mcp.ifood.com.br/marketplace`, `authorization_servers=["https://id.ifood.com.br"]` |
| OIDC discovery | `https://id.ifood.com.br/.well-known/openid-configuration` responde |
| `issuer` | `https://id.ifood.com.br/3p` (≠ host do AS) |
| `authorization_endpoint` | `https://id.ifood.com.br/authorize` |
| `token_endpoint` | `https://id.ifood.com.br/token` |
| `revocation_endpoint` | `https://id.ifood.com.br/revoke` |
| `pushed_authorization_request_endpoint` | `https://id.ifood.com.br/par` |
| `grant_types_supported` | `authorization_code`, `refresh_token` |
| `token_endpoint_auth_methods_supported` | `client_secret_basic`, `client_secret_post`, `private_key_jwt` |
| `code_challenge_methods_supported` | `S256` → **PKCE obrigatório na prática** |
| `registration_endpoint` | **ausente** → sem registro dinâmico; usar o `client_id` cadastrado no portal |
| `scopes_supported` | **ausente** → strings de escopo precisam ser copiadas do portal |

**Pontos para o feedback do MCP (observados, reproduzíveis):**
1. `/.well-known/oauth-authorization-server` (RFC 8414), inclusive com o sufixo `/3p`, responde **HTTP 400**. Só o `openid-configuration` funciona. Clientes MCP que seguem a especificação e consultam primeiro o RFC 8414 podem falhar.
2. A mensagem do 401 orienta o cliente a se *"re-register"* automaticamente, mas o AS não anuncia `registration_endpoint`.
3. `issuer` (`…/3p`) diverge da URL anunciada em `authorization_servers` (`https://id.ifood.com.br`). Validadores estritos de issuer podem rejeitar.

---

## 1. Decisões de arquitetura do back-end

1. **Monólito modular em FastAPI**, porta **8000** (a URL de callback cadastrada é `http://localhost:8000/auth/callback`).
2. **O backend é o cliente MCP e o cliente OAuth confidencial.** Tokens e `client_secret` nunca chegam ao frontend. O frontend recebe só um cookie de sessão opaco (`HttpOnly`, `SameSite=Lax`).
3. **O agente é um componente externo, acessado por uma porta (`AgentPort`).** Ele é stateless (uma mensagem por execução) e já tem a própria ferramenta de busca no MCP, somente leitura. O back-end guarda sessão, histórico e tags com consentimento, reenvia esse contexto a cada execução, **revalida no MCP todo produto citado** e valida tudo o que o agente devolve (seção 10). Operações de escrita (`createCart`, `submitOrder` etc.) **nunca** são expostas ao agente. Elas só rodam por endpoints de confirmação explícita do usuário. Até a integração, um `StubAgent` determinístico permite rodar e testar o back-end inteiro.
4. **Livro de evidências por sessão (evidence ledger):** toda resposta do MCP é registrada com ID, horário e ferramenta. Qualquer produto, preço ou loja citado pelo agente é **validado contra o ledger**; IDs que não aparecem lá são descartados. Isso impede o agente de inventar dados.
5. **Proveniência explícita em todo dado devolvido:** `DECLARED` (usuário), `INFERRED` (modelo), `MCP` (iFood), `ESTIMATED` (cálculo/heurística), `EXECUTED` (ação confirmada pelo servidor), `FIXTURE` (somente se for indispensável usar dado simulado).
6. **Dinheiro em centavos (`int`)**, nunca em float. Totais calculados pelo backend.
7. **Máquina de estados explícita da sessão** para impedir compra fora da etapa correta.
8. **Persistência P0 em memória**, com TTL. SQLite (perfil) só no P1.
9. **Vertical como plugin:** `verticals/market/` implementa a interface `VerticalPolicy`. Pet e Farmácia ficam como pontos de extensão vazios, documentados e não implementados.

---

## 2. Estrutura de pastas

```
backend/
├── pyproject.toml / requirements.txt
├── .env.example                      # sem segredos reais
├── app/
│   ├── main.py                       # FastAPI app, CORS, middlewares, routers
│   ├── config.py                     # pydantic-settings (lê .env)
│   ├── api/                          # contratos internos HTTP (não são endpoints iFood)
│   │   ├── deps.py                   # sessão atual, auth obrigatória, etc.
│   │   ├── auth.py                   # /auth/login, /auth/callback, /auth/status, /auth/logout
│   │   ├── integration.py            # /api/integration/status, /api/integration/tools
│   │   ├── context.py                # /api/context/parse, /confirm, (/parse-image)
│   │   ├── profile.py                # /api/profile
│   │   ├── plan.py                   # /api/plan, /api/plan/{id}/choose
│   │   ├── commerce.py               # /api/addresses, /api/products/search, /api/cart/*
│   │   ├── agent.py                  # /api/agent/message — monta envelope, chama AgentPort
│   │   ├── agent_tools.py            # /agent-tools/* — só se for escolhida a opção B (seção 10.5)
│   │   └── schemas.py                # DTOs de request/response (Pydantic)
│   ├── domain/                       # entidades puras, sem I/O
│   │   ├── enums.py                  # Provenance, QuantityKind, Strategy, SessionStage...
│   │   ├── inventory.py              # InventoryItem
│   │   ├── context.py                # UserContext
│   │   ├── profile.py                # UserProfile, DietaryPreference, Restriction (sensível)
│   │   ├── needs.py                  # PurchaseNeed
│   │   ├── products.py               # ProductCandidate, MerchantInfo
│   │   ├── recommendation.py         # MealOption, Recommendation
│   │   └── cart.py                   # CartProposal, CartSnapshot
│   ├── application/                  # casos de uso / orquestração
│   │   ├── session_flow.py           # máquina de estados
│   │   ├── capture.py                # entrada -> AgentPort.extract -> UserContext rascunho
│   │   ├── planning.py               # AgentPort.plan -> valida plano
│   │   ├── sourcing.py               # faltantes -> busca MCP -> candidatos (+ fallback)
│   │   └── cart.py                   # proposta -> confirmação -> createCart/getCart
│   ├── agent_port/                   # SOMENTE o contrato; o agente fica fora deste repo/escopo
│   │   ├── contracts.py              # AgentEnvelope / AgentOutput (Pydantic), versionados
│   │   ├── envelope.py               # monta a mensagem única: tags + contexto + histórico
│   │   ├── port.py                   # AgentPort (Protocol): run(envelope, access_token)
│   │   ├── http_adapter.py           # chama o serviço do agente via HTTP (na integração)
│   │   └── stub.py                   # StubAgent determinístico (dev/testes/demo de contingência)
│   ├── rules/                        # determinístico, 100% testável
│   │   ├── normalize.py              # nomes de ingredientes, sinônimos, unidades
│   │   ├── missing.py                # receita x inventário -> faltantes
│   │   ├── packaging.py              # quantidade da receita -> unidades compráveis
│   │   ├── budget.py                 # subtotal, taxas conhecidas, orçamento
│   │   ├── restrictions.py           # filtros por preferência/alergia (sinalização)
│   │   └── authorization.py          # pode executar ação? (estado + confirmação + hash)
│   ├── integrations/ifood/
│   │   ├── oauth.py                  # PKCE, authorize URL, troca de code, refresh, revoke
│   │   ├── token_store.py            # tokens por sessão (memória)
│   │   ├── mcp_client.py             # conexão Streamable HTTP + Bearer, timeouts
│   │   ├── registry.py               # tools/list, cache de schemas, checagem de capacidades
│   │   ├── errors.py                 # normalização de erros (4 formatos de envelope)
│   │   ├── gateway.py                # IfoodGateway: interface tipada das operações reais
│   │   └── mappers.py                # resposta MCP -> ProductCandidate/MerchantInfo...
│   ├── verticals/
│   │   ├── base.py                   # VerticalPolicy (Protocol)
│   │   └── market/policy.py          # merchantType=GROCERIES, regras de refeição
│   └── infrastructure/
│       ├── session_store.py          # sessões em memória com TTL
│       ├── ledger.py                 # evidence ledger por sessão
│       └── logging.py                # logs JSON, correlation-id, redação de PII
└── tests/
    ├── unit/                         # rules/, mappers, errors, session_flow
    ├── integration/                  # gateway contra FakeIfoodGateway
    └── fixtures/mcp/                 # respostas reais gravadas (sem tokens/PII)
```

`.gitignore`: hoje cobre apenas Node. Adicionar `.env`, `__pycache__/`, `.venv/`, `.pytest_cache/` e `*.sqlite`.

---

## 3. Dependências

| Pacote | Uso |
|---|---|
| `fastapi`, `uvicorn[standard]` | API |
| `pydantic>=2`, `pydantic-settings` | contratos e configuração |
| `httpx` | OAuth (token, refresh, revoke) |
| `mcp` (SDK oficial Python) | cliente Streamable HTTP, `initialize`, `tools/list`, `tools/call` |
| `itsdangerous` | assinatura do cookie de sessão |
| `pytest`, `pytest-asyncio`, `respx` | testes |

Python 3.11+.

---

## 4. Configuração (`.env`, nunca versionado)

```
APP_ENV=dev
APP_BASE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
SESSION_SECRET=<aleatório>
SESSION_TTL_MIN=120

IFOOD_CLIENT_ID=<portal>
IFOOD_CLIENT_SECRET=<portal>
IFOOD_REDIRECT_URI=http://localhost:8000/auth/callback
IFOOD_AUTHORIZE_URL=https://id.ifood.com.br/authorize
IFOOD_TOKEN_URL=https://id.ifood.com.br/token
IFOOD_REVOKE_URL=https://id.ifood.com.br/revoke
IFOOD_SCOPES=<copiar literalmente do portal, separados por espaço>
IFOOD_RESOURCE=https://consumer-mcp.ifood.com.br/marketplace
IFOOD_MCP_URL=https://consumer-mcp.ifood.com.br/marketplace
IFOOD_MCP_TIMEOUT_S=20
IFOOD_SANDBOX=true                    # exibido na UI como "sandbox"

AGENT_MODE=stub                       # stub | http
AGENT_URL=<URL do serviço do agente, definida na integração>
AGENT_TIMEOUT_S=30
AGENT_HISTORY_TURNS=6
AGENT_TOOLS_TOKEN=<só na opção B: segredo p/ o agente chamar /agent-tools/*>
MCP_MODE=live                         # live | fixture (fixture só se o MCP bloquear; marcado FIXTURE)
```

---

## 5. Autenticação OAuth do consumidor (bloco crítico, P0)

Fluxo **Authorization Code + PKCE (S256)**, cliente confidencial (`client_secret_post`; se falhar, tentar `client_secret_basic`).

```
Frontend            Backend :8000                     id.ifood.com.br            consumer-mcp
   │ GET /auth/login ──►│ gera state, code_verifier,
   │                    │ code_challenge; salva em pending[state]
   │◄── 302 ────────────│ /authorize?response_type=code&client_id&redirect_uri
   │                    │   &scope&state&code_challenge&code_challenge_method=S256
   │                    │   &resource=<IFOOD_RESOURCE>
   │ ── login do usuário de teste ───────────────────────►│
   │◄─────────────── 302 http://localhost:8000/auth/callback?code&state
   │ GET /auth/callback►│ valida state (uso único, TTL 10 min)
   │                    │ POST /token (grant_type=authorization_code, code,
   │                    │   redirect_uri, code_verifier, client_id, client_secret, resource)
   │                    │ ◄── access_token, refresh_token, expires_in
   │                    │ grava no token_store[session_id]
   │                    │ initialize + tools/list ───────────────────────────────►│
   │◄── 302 FRONTEND_URL/?auth=ok
```

**Regras:**
- O `state` é obrigatório e de uso único, vinculado ao cookie de sessão (proteção CSRF).
- **Refresh proativo** quando faltarem menos de 60 s para `expires_at`. Diante de um 401 do MCP: um refresh e uma nova tentativa; se falhar de novo, retornar `AUTH_REQUIRED`. Nunca entrar em laço.
- `/auth/logout` revoga o refresh token (`/revoke`) e limpa a sessão.
- O parâmetro `resource` (RFC 8707) deve ser enviado. Se o AS rejeitar, testar sem ele e registrar o resultado no feedback.
- O PAR (`/par`) existe, mas fica fora do P0; registrar apenas como opção.
- Logs **nunca** incluem `code`, tokens ou `client_secret`.

**Pré-requisitos humanos (bloqueadores):** gerar o Client Secret no portal, criar o usuário de teste sandbox (`ONLY_TEST_AGENT`) e copiar as strings exatas dos escopos.

---

## 6. Adapter MCP (`integrations/ifood/`)

- **Transporte:** Streamable HTTP via SDK `mcp`, com header `Authorization: Bearer <access_token>`. No P0, abrir sessão por operação (`async with`), que é simples e robusto. Se a latência atrapalhar, cachear o `ClientSession` por usuário, protegido por lock.
- **Registry:** após o login, executar `tools/list`. Salvar nome, descrição e `inputSchema` em cache e gravar uma cópia em `tests/fixtures/mcp/tools_list.json` (sem PII) como evidência. Antes de cada chamada, verificar se a ferramenta existe; se não existir, retornar `TOOL_NOT_AVAILABLE`. **Os schemas reais prevalecem sobre a documentação.**
- **`IfoodGateway` (interface tipada)**, somente com operações reais:

| Método do gateway | Ferramenta MCP | Exposto ao agente? |
|---|---|---|
| `list_addresses()` | `listAddresses` | não (o backend chama) |
| `search_items(query, location, merchant_type, refinements)` | `searchOffers` (`resultKind=ITEM`) | **sim** (leitura) |
| `get_item(id)` | `getItem` | **sim** (leitura) |
| `get_merchant(id)` | `getMerchant` | **sim** (leitura) |
| `list_taxonomy()` | `listItemTaxonomy` | opcional |
| `create_cart(merchant, address, items, options=[])` | `createCart` | **não** (somente via confirmação) |
| `get_cart(id)` | `getCart` | não |
| `get_delivery_methods(cart)` | `getCartDeliveryMethods` | não |
| checkout (`setCartDelivery`, `setCartPayment`, `submitOrder`) | — | **não**, condicional/P1 |

- **Normalização de erros:** a documentação traz quatro formatos (`errors` em User/Discovery, `error` em Cart, campos na raiz em Tracking, e erro de negócio dentro de HTTP 200 / `isError`). Todos são convertidos para:
  `IfoodError(kind ∈ {AUTH_REQUIRED, TOOL_NOT_AVAILABLE, BUSINESS, VALIDATION, TIMEOUT, TRANSPORT, SCHEMA_MISMATCH}, tool, message, retriable, raw_ref)`.
- **Timeouts e retries:** leituras têm timeout de 20 s e até 1 retry com backoff, apenas para `TIMEOUT`/`TRANSPORT`. **Escritas nunca têm retry automático.** Diante de um resultado incerto, reconciliar com `getCart`.
- **Limites:** no máximo N buscas por plano (ex.: 8), para evitar loops do agente.
- **Ledger:** cada resposta de leitura entra no ledger da sessão (`tool`, `args sem PII`, `ids retornados`, `timestamp`).

---

## 7. Domínio (contratos Pydantic principais)

```python
class Provenance(StrEnum): DECLARED, INFERRED, MCP, ESTIMATED, EXECUTED, FIXTURE
class QuantityKind(StrEnum): KNOWN, ESTIMATED, UNKNOWN
class Strategy(StrEnum): USE_WHAT_I_HAVE, COMPLETE_WITH_MARKET, CONVENIENCE

class InventoryItem:      id, name, normalized_name, quantity: Decimal|None, unit|None,
                          quantity_kind, source: Literal["text","image","profile"],
                          provenance, confirmed: bool
class UserContext:        goal, people: int|None, time_min: int|None, budget_cents: int|None,
                          items: list[InventoryItem], notes
class UserProfile:        preferences: list[str] (ex. VEGETARIAN), dislikes: list[str],
                          shopping_prefs, restrictions: SensitiveRestrictions|None,
                          consent: {store_profile: bool, use_sensitive: bool}
class SensitiveRestrictions: allergies: list[str], health_flags: list[str]  # opcional, nunca logado
class PurchaseNeed:       ingredient, quantity|None, unit|None, priority, constraints
class ProductCandidate:   item_id, merchant_id, name, price_cents|None, promo_price_cents|None,
                          available|None, package_size|None, deeplink|None, provenance=MCP,
                          allergen_info_status: Literal["unknown","declared_by_catalog"]
class MealOption:         title, strategy, uses: list[str], missing: list[PurchaseNeed],
                          time_min, servings, steps_summary, rationale, provenance=INFERRED
class Recommendation:     meal, merchant, selected_products, subtotal_cents, known_fees_cents|None,
                          budget_status: Literal["within","over","unknown_total"], limitations: list[str]
class CartProposal:       id, merchant_id, address_id, lines, subtotal_cents, snapshot_hash, expires_at
```

---

## 8. Máquina de estados da sessão

```
NEW → CONTEXT_DRAFTED → CONTEXT_CONFIRMED → PLANNED → STRATEGY_CHOSEN
    → PRODUCTS_FOUND → PROPOSAL_READY → CART_CREATED → (ORDER_SUBMITTED, condicional)
```
- Cada endpoint declara de quais estados pode ser chamado; fora deles, retorna **409**.
- Se o usuário editar ingredientes depois de `PLANNED`, a sessão volta para `CONTEXT_CONFIRMED`.
- A estratégia `USE_WHAT_I_HAVE` termina em `STRATEGY_CHOSEN`, um fluxo completo sem compra.

---

## 9. API interna (contrato com o frontend)

O OpenAPI fica disponível automaticamente em `http://localhost:8000/docs`. Toda resposta segue o envelope `{ data, provenance_notes?, limitations?, errors? }`, e cada item carrega o próprio `provenance`.

| Método | Rota | Função | Estado exigido |
|---|---|---|---|
| GET | `/health` | liveness | — |
| GET | `/auth/login` | inicia OAuth (302) | — |
| GET | `/auth/callback` | **callback cadastrado**; troca o code | — |
| GET | `/auth/status` | `{authenticated, expires_in, sandbox}` | — |
| POST | `/auth/logout` | revoga e limpa | — |
| GET | `/api/integration/status` | MCP alcançável, nº de ferramentas, ferramentas faltantes, modo `live/fixture` | — |
| GET | `/api/integration/tools` | nomes e descrições do `tools/list` (para demo e debug) | auth |
| POST | `/api/session` | cria sessão de planejamento | — |
| POST | `/api/agent/message` | `{text}` → monta `AgentEnvelope` (tags + contexto + histórico) → `AgentPort.run` → saída validada (ingredientes `INFERRED`, opções, produtos revalidados, `pergunta_tags`) | NEW+ |
| POST | `/api/context/parse-image` | multipart → repassa ao agente; itens voltam como hipóteses | **condicional** |
| PUT | `/api/context` | usuário corrige/confirma ingredientes e contexto | DRAFTED+ |
| GET/PUT | `/api/profile` | preferências e tags declaradas (sensíveis exigem `consent.use_sensitive_for_recommendations`); responde `saved_at` | — |
| PUT | `/api/profile/tags-answer` | resposta do formulário de tags: `{preferencias, alergias, intolerancias, condicoes_saude}` ou `{declined:true}` | — |
| DELETE | `/api/profile/sensitive` | apaga restrições sensíveis | — |
| POST | `/api/plan` | `AgentPort.run` com contexto confirmado → 2–3 `MealOption` (A/B, C se houver) | CONFIRMED |
| POST | `/api/plan/{option_id}/choose` | escolhe uma opção | PLANNED |
| GET | `/api/addresses` | `listAddresses` | auth |
| PUT | `/api/session/address` | define o endereço da busca | auth |
| POST | `/api/products/search` | faltantes → `searchOffers` (GROCERIES) → candidatos agrupados por loja e `Recommendation` | CHOSEN + auth + endereço |
| POST | `/api/cart/proposal` | monta `CartProposal` + `snapshot_hash` (preços e quantidades) | PRODUCTS_FOUND |
| POST | `/api/cart/confirm` | `{proposal_id, snapshot_hash, confirm:true}` → `createCart` → `getCart` → totais do servidor e deeplink | PROPOSAL_READY |
| GET | `/api/cart/{id}` | `getCart` atualizado | CART_CREATED |

**Exemplo de `/api/agent/message` (resposta simplificada):**
```json
{"text": "Tenho arroz, ovos, tomate e cenoura. Quero preparar um jantar para duas pessoas, tenho 30 minutos e posso gastar até R$ 35."}
→ {"data": {"goal":"jantar","people":2,"time_min":30,"budget_cents":3500,
   "items":[{"name":"arroz","quantity_kind":"UNKNOWN","provenance":"INFERRED","confirmed":false}, …]}}
```

---

## 10. Integração com o agente (o agente em si está fora do escopo)

O back-end **não implementa** o agente. Ele monta a entrada de cada execução, guarda o que o agente não guarda (sessão, histórico e perfil/tags), valida as saídas e cuida do carrinho.

### 10.1 O que já sabemos do agente (informado pela pessoa responsável)

- Usa o OpenAI Agents SDK.
- Tem uma ferramenta local `search_market_items` → cliente MCP próprio → `searchOffers`. **Uma busca real já foi validada.**
- É **somente leitura**: não tem carrinho nem compra.
- A busca é **textual, só em Mercado**, e não aplica filtros estruturados de dieta ou saúde.
- **Recebe uma única mensagem por execução**, sem histórico e sem perfil persistente.
- Antes de sugerir refeições, considera as tags declaradas. Se não houver nenhuma, **pergunta de forma opcional** sobre vegetariano/vegano, alergias/intolerâncias e saúde (ex.: diabetes).
- Não infere tags, não garante segurança de alérgenos nem adequação clínica, e **não afirma que algo foi salvo**.

### 10.2 Responsabilidades do back-end que decorrem disso

1. **Sessão e histórico.** O agente é stateless, então o back-end guarda os turnos da sessão (`session_store`) e o estado da pergunta de tags (`TagsQuestionState`: `NOT_ASKED` → `ASKED` → `ANSWERED` | `DECLINED`).
2. **Perfil e tags com consentimento** (`/api/profile`). O agente não salva nada.
   - **Preferências** (não sensíveis): `VEGETARIAN`, `VEGAN`, além de desgostos e preferências de compra.
   - **Restrições sensíveis**, separadas: `allergies[]`, `intolerances[]`, `health_conditions[]` (ex.: `DIABETES`). Exigem `consent.use_sensitive_for_recommendations=true`, nunca entram em log e podem ser apagadas com `DELETE /api/profile/sensitive`.
   - Só o back-end confirma que algo foi salvo, devolvendo `saved_at` na resposta. A UI exibe "salvo" a partir dessa resposta, nunca a partir do texto do agente.
   - P0 em memória por sessão; P1 com persistência em SQLite (só se o usuário consentir `store_profile`).
3. **Tags preenchidas por formulário estruturado, não por texto livre.** Quando o agente pergunta sobre tags, a UI mostra chips (vegetariano, vegano, alergias, diabetes…) e um botão "prefiro não informar". O back-end grava a escolha de forma determinística. Assim ninguém precisa interpretar a resposta livre, o que respeita a regra de não inferir tags.
4. **Reenvio do contexto a cada execução.** O back-end monta uma mensagem única (`AgentEnvelope`) com as tags e o restante do contexto (ver 10.3).
5. **Revalidação de produtos.** Os resultados do MCP do agente não passam pelo ledger do back-end. Por isso, todo produto citado pelo agente precisa trazer `item_id` e `merchant_id`. O back-end **revalida com o próprio cliente MCP** (`getItem`/`getMerchant`) antes de exibir preço ou montar carrinho. Produto sem ID ou não encontrado é descartado e anotado em `limitations`.
6. **Endereço e localização.** `searchOffers` exige `userLocation`. O back-end obtém o endereço via `listAddresses` e o envia na entrada da execução.
7. **Carrinho continua só no back-end.** `createCart`/`getCart` acontecem apenas após confirmação explícita (seções 9 e 11), o que é coerente com o agente ser somente leitura.

### 10.3 Entrada de cada execução (`AgentEnvelope`, proposta)

O agente aceita uma mensagem por execução. O back-end serializa o contexto em um bloco delimitado, seguido da mensagem atual do usuário:

```text
<contexto_despensa v="1">
{
  "tags_declaradas": {"preferencias": ["VEGETARIAN"], "alergias": [], "intolerancias": ["LACTOSE"],
                      "condicoes_saude": [], "estado": "ANSWERED"},
  "inventario_confirmado": [{"nome": "arroz", "quantidade": null, "origem": "DECLARED"}, ...],
  "objetivo": "jantar", "pessoas": 2, "tempo_min": 30, "orcamento_centavos": 3500,
  "localizacao": {"latitude": ..., "longitude": ...},
  "historico_resumido": [{"papel": "usuario", "texto": "..."}, {"papel": "agente", "texto": "..."}]
}
</contexto_despensa>
<mensagem_usuario>Tenho arroz, ovos, tomate e cenoura...</mensagem_usuario>
```

- Se o estado for `DECLINED`, o envelope diz `"estado": "DECLINED"`, para o agente **não perguntar de novo**.
- Restrições sensíveis só entram no envelope com consentimento; caso contrário, vão como `"nao_compartilhado"`.
- O histórico é truncado aos últimos N turnos, para limitar tamanho e custo.
- O token OAuth **nunca** entra na mensagem (ver 10.5).

### 10.4 Saída esperada do agente (a combinar)

Para o back-end conseguir validar os dados e o front conseguir mostrar cards, a saída precisa ser **estruturada** (`output_type` Pydantic no Agents SDK):

```json
{
  "contract_version": "1",
  "mensagem": "texto para o usuário",
  "pergunta_tags": true,
  "ingredientes_reconhecidos": [{"nome": "tomate", "quantidade": null, "unidade": null}],
  "opcoes": [{"titulo": "...", "estrategia": "USE_WHAT_I_HAVE|COMPLETE_WITH_MARKET|CONVENIENCE",
              "usa": ["arroz", "ovos"], "faltantes": ["cebola"], "justificativa": "..."}],
  "produtos": [{"faltante": "cebola", "item_id": "...", "merchant_id": "...",
                "nome_observado": "...", "preco_observado_centavos": 499}]
}
```

`preco_observado_centavos` serve apenas para conferência. **O preço exibido é sempre o revalidado pelo back-end.** Se o agente hoje devolve só texto, isso precisa mudar antes da integração; sem IDs, não há como montar o carrinho nem provar a origem dos dados.

### 10.5 Ponto em aberto: autenticação do MCP do agente

O cliente MCP do agente precisa de um token de consumidor, e o callback OAuth (`http://localhost:8000/auth/callback`) chega no back-end. Duas opções:

| Opção | Como funciona | Prós | Contras |
|---|---|---|---|
| **A (recomendada)** | O back-end faz o OAuth e repassa o `access_token` ao serviço do agente **por header HTTP** em cada execução (`X-Ifood-Access-Token`), nunca no prompt. A ferramenta `search_market_items` usa esse token. | Reaproveita o cliente MCP que já funciona no agente; mudança pequena | O token trafega entre os dois serviços locais; não pode ser logado |
| B | A ferramenta do agente chama `POST {backend}/agent-tools/search-items` em vez do MCP direto | O token nunca sai do back-end; ledger único | O agente precisa trocar o cliente MCP por uma chamada HTTP |

A interface `AgentPort` funciona com as duas opções. O `/agent-tools/*` só será implementado se a opção B for a escolhida.

### 10.6 Interface no back-end

```python
class AgentPort(Protocol):
    async def run(self, envelope: AgentEnvelope, access_token: str | None) -> AgentOutput: ...
```
- `HttpAgentAdapter` faz `POST {AGENT_URL}/run` com timeout de `AGENT_TIMEOUT_S`. O formato exato do endpoint será combinado com a pessoa do agente.
- `StubAgent`, determinístico e sem LLM, para desenvolver e testar o back-end antes da integração. Faz parse simples do texto do exemplo, devolve duas opções fixas e usa o fallback de busca. Aparece como `agent_mode: "stub"` em `/api/integration/status`.

### 10.7 Validação do que o agente devolve (rules/), sempre aplicada

- Resposta fora do schema → `AGENT_INVALID_OUTPUT`: registrar no log e usar o fallback.
- Ingredientes reconhecidos voltam como `INFERRED`, `confirmed=false`, e o usuário confirma na UI.
- Itens marcados como "usados" precisam existir no inventário confirmado. Se não existirem, viram faltantes.
- Faltantes que já estão no inventário são removidos.
- Produtos sem `item_id`/`merchant_id`, ou que não passam na revalidação MCP, são descartados e anotados em `limitations`.
- Tags declaradas são checadas de forma determinística sobre o **texto** da opção. Exemplo: com `VEGETARIAN`, uma opção que cite carne recebe aviso. Isso é só sinalização, sem garantia.
- Alergias e intolerâncias geram aviso, nunca afirmação de segurança: `allergen_info_status="unknown"`. A busca do agente não aplica filtros de dieta, e a UI deixa isso claro.
- **Fallback determinístico:** se o agente falhar ou estourar o tempo, o back-end busca cada faltante com o próprio cliente MCP (`searchOffers` GROCERIES) e escolhe pelo menor preço por unidade compatível. Assim a demo não depende do agente para alcançar o MCP.

---

## 11. Regras determinísticas (`rules/`)

- **normalize:** minúsculas, sem acento, singular, mapa de sinônimos (ex.: "tomates" → "tomate") e unidades (g, kg, ml, l, un, dúzia).
- **missing:** `need − inventory` comparando `normalized_name`. Quando a quantidade é `UNKNOWN`, considerar que o item está disponível, sem comprar de novo.
- **packaging:** extrai o tamanho da embalagem do nome ou dos atributos do item (ex.: "1kg"), calcula `ceil(qtd_receita / embalagem)` e define, no mínimo, 1 unidade. Se não houver como extrair, usa 1 unidade e marca `ESTIMATED`.
- **budget:** soma dos itens em centavos (preço promocional, se existir). A comparação com o orçamento é rotulada como **"subtotal de itens"**. O status `within` só é usado quando taxas e entrega são conhecidas; caso contrário, `unknown_total`. Depois do `createCart`, prevalecem os totais do `getCart`.
- **single merchant:** a proposta de carrinho usa uma loja (`createCart` exige estabelecimento). Ranking: maior cobertura de faltantes, depois menor subtotal.
- **authorization:** `confirm` só é executado se o estado for `PROPOSAL_READY`, `confirm=true`, o `snapshot_hash` coincidir e a proposta não tiver expirado (10 min). Se o preço mudar na revalidação, a aprovação anterior é invalidada.
- **idempotência:** `proposal_id` é a chave. Um segundo `confirm` com o mesmo ID devolve o carrinho já criado, ou `IN_PROGRESS`, sem nova chamada.

---

## 12. Observabilidade, segurança e privacidade

- Logs JSON com `correlation_id` (header `X-Request-ID`), `session_id` (hash), `tool`, `duration_ms`, `outcome` e `error.kind`.
- **Redação obrigatória:** tokens, `code`, `client_secret`, endereço completo, `SensitiveRestrictions` e imagem.
- `GET /api/integration/status` mostra na demo que os dados vêm do MCP real e indica sandbox.
- CORS só para `FRONTEND_URL`, com `allow_credentials=true`. Recomendação ao front: proxy do Vite `/api` e `/auth` → `:8000`.
- O upload de imagem é limitado a 5 MB (jpeg/png/webp), processado em memória e não persistido.
- O modo `MCP_MODE=fixture` só é ativado se o MCP estiver bloqueado. Nesse caso, todo item sai como `provenance=FIXTURE` e o status mostra `mode: "fixture"`.

---

## 13. Testes

- **Unitários (prioridade):** `rules/*`, `errors.normalize` (quatro formatos), `mappers` com fixtures reais gravadas, `session_flow` (transições inválidas → 409) e `authorization` (hash divergente, expirado, duplo confirm).
- **Integração:** `application/*` com um `FakeIfoodGateway` (somente em testes) e o `StubAgent`.
- **Contrato:** testes que validam respostas de exemplo do agente contra `agent_port/contracts.py`. Os exemplos são entregues pela pessoa do agente.
- **Smoke real (manual/script):** `scripts/smoke_mcp.py` → login → `tools/list` → `listAddresses` → `searchOffers` GROCERIES "tomate". É o critério do marco 1.
- **Cenários de demo:** exemplo do contexto (arroz, ovos, tomate, cenoura; 2 pessoas; 30 min; R$ 35), estratégia sem compra, catálogo vazio, token expirado, orçamento insuficiente e preferência vegetariana.

---

## 14. Cronograma de execução (Brasília)

| Janela | Entrega | Critério de pronto |
|---|---|---|
| **17/10 18h–19h30 · Marco 1: risco MCP** | esqueleto FastAPI, `config`, `oauth.py`, `/auth/*`, `mcp_client`, `registry`, `scripts/smoke_mcp.py` | login real com usuário sandbox; `tools/list` salvo; 1 `searchOffers` GROCERIES com IDs e preço reais |
| 19h30–20h | **contratos**: `api/schemas.py` (front) + `agent_port/contracts.py` exportado em JSON Schema (agente) | front e agente conseguem codar contra os contratos |
| 20h–21h30 | `domain/`, `rules/` + testes, `session_store` (histórico + estado das tags), `StubAgent`, `envelope.py`, `/api/agent/message`, `/api/context`, `/api/profile*` | testes de rules passando; tags salvas com consentimento e reenviadas no envelope |
| 21h30–23h | `/api/plan`, `/api/addresses`, revalidação de produtos (`getItem`/`getMerchant`), `/api/products/search` com fallback, `http_adapter` | jornada texto → produtos reais ponta a ponta com `AGENT_MODE=stub` |
| 23h–00h | `/api/cart/proposal` + `/api/cart/confirm` (`createCart` + `getCart`), idempotência | carrinho criado no sandbox somente após confirmação |
| 00h–01h | estabilização: erros normalizados, token expirado, catálogo vazio, mínimo de pedido | nenhum caminho de erro vira "sucesso" |
| *Condicional* 01h–02h | `/api/context/parse-image` (só repassa a imagem ao `AgentPort.extract`) | só se a jornada por texto estiver estável |
| **18/10 08h–10h** | **integração**: `AGENT_MODE=http` com o agente real + front; refresh/relogin, logs | demo gravável; o stub continua como contingência |
| 10h–11h30 | seção técnica do back no documento: arquitetura, decisões MCP, **feedback MCP** (seção 0 + achados reais) | — |
| 11h30 | **congelar código** | — |

Checkout (`setCartDelivery`/`setCartPayment`/`submitOrder`) **fora do plano principal**. Só entra se sobrar tempo depois das 01h, com teste ponta a ponta no sandbox e nova confirmação explícita. Antes, é preciso validar a divergência do `cardTokenId` e do `selectedTimeSlotId`.

---

## 15. Riscos e mitigação

| Risco | Impacto | Mitigação |
|---|---|---|
| Client Secret, usuário de teste ou escopos ainda não disponíveis | bloqueia tudo | resolver **antes** de codar o resto; acionar mentores imediatamente |
| AS rejeita `resource` ou exige parâmetro não documentado | login falha | testar variações no smoke e registrar no feedback |
| Catálogo GROCERIES vazio para o endereço sandbox | sem produtos na demo | testar cedo com 2–3 endereços; tela de "nenhum produto" honesta |
| Schema real ≠ documentação | erros de chamada | registry com `inputSchema` real; mappers tolerantes, com log de `SCHEMA_MISMATCH` |
| Latência (LLM + várias buscas) | demo lenta | buscas em paralelo (`asyncio.gather`, limite 4), fallback determinístico, timeouts |
| Agente atrasa ou diverge do contrato na integração | jornada quebra | contratos versionados desde 19h30, testes de contrato, `StubAgent` + fallback mantêm a demo funcionando |
| `createCart` não suportado para GROCERIES no sandbox | sem carrinho | parar em `Recommendation` + deeplink (se o MCP retornar) e documentar como limitação real |

---

## 16. Pendências que dependem da equipe

Dados do **cadastro do agente no portal iFood** (app CompletAI). O back-end os usa porque o callback OAuth chega nele. Eles **não bloqueiam o desenvolvimento** (uso valores provisórios no `.env`); só são necessários para o Marco 1, o teste real:
1. **Client Secret** gerado, entregue ao back-end por canal privado (nunca no Git).
2. **Usuário de teste sandbox** criado no portal.
3. **Strings exatas dos escopos** aprovados no portal.

Alinhamentos:
4. **Com a pessoa do agente** (seção 10):
   - **Autenticação do MCP do agente:** opção A (token por header) ou B (via `/agent-tools`)? Hoje, de onde vem o token usado na busca validada?
   - **`userLocation`:** como o agente o obtém hoje? Proposta: o back-end envia no envelope.
   - **Saída estruturada** com `item_id`/`merchant_id` (10.4). Hoje a saída é texto livre ou estruturada?
   - **Formato de execução:** o agente vira um serviço HTTP (`POST /run`, porta?) ou uma biblioteca Python importada pelo back-end?
   - **Aceite do `AgentEnvelope`** (10.3) e um exemplo real de saída para os testes de contrato.
5. **Com o frontend:** porta 5173, proxy Vite e o contrato da seção 9.
6. Termos e política de privacidade do agente no portal ainda apontam para `http://google.com`.
