# Configuração

## Variáveis de ambiente

Lidas por `Settings.from_env()` (`backend/app/settings.py`) e por `agent.py`.
Modelo em [`backend/.env.example`](../../../backend/.env.example).

| Variável | Obrigatória | Padrão | Uso |
|---|---|---|---|
| `IFOOD_CLIENT_ID` | Para busca | — | Client ID do agente no portal de desenvolvedores iFood |
| `IFOOD_CLIENT_SECRET` | Para busca | — | Client secret do agente |
| `IFOOD_REDIRECT_URI` | Não | `http://localhost:8000/auth/callback` | Deve ser igual à URL cadastrada no portal |
| `IFOOD_SCOPES` | Não | `mcp.discovery.search.read` | Escopos pedidos no login |
| `IFOOD_MCP_URL` | Não | `https://consumer-mcp.ifood.com.br/marketplace` | Gateway MCP |
| `OPENAI_API_KEY` | Sim | — | Sem ela, `/api/agent/message` responde `503` |
| `OPENAI_MODEL` | Não | `gpt-4.1-mini` | Modelo usado pelos dois agentes; precisa aceitar imagens para a captura por foto |

- As variáveis entram pelo `--env-file .env` do uvicorn. A aplicação **não** lê
  `.env` sozinha.
- `Settings` é lido a cada requisição, então mudar uma variável exige reiniciar
  o processo (e, portanto, refazer o login).
- Sem `IFOOD_CLIENT_ID` e `IFOOD_CLIENT_SECRET`, as ideias de refeição funcionam
  normalmente; só a busca no Mercado fica indisponível.

## Portal de desenvolvedores iFood

Para a busca funcionar, o agente cadastrado no portal precisa de:

- Callback `http://localhost:8000/auth/callback`.
- Escopo `mcp.discovery.search.read` aprovado.
- Um consumidor para fazer login (a conta de teste `ONLY_TEST_AGENT` é de
  sandbox).

## Dependências Python

`backend/requirements.txt`:

| Pacote | Faixa | Para quê |
|---|---|---|
| `fastapi` | `>=0.115,<1` | API e validação |
| `uvicorn[standard]` | `>=0.34,<1` | Servidor ASGI |
| `mcp` | `>=2.3,<3` | SDK oficial do Model Context Protocol |
| `httpx2` | `>=2.13,<3` | Cliente HTTP assíncrono (OAuth e transporte MCP) |
| `openai-agents` | `>=0.24,<0.25` | Agents SDK (agente, ferramentas, saída estruturada) |
| `jsonschema` | `>=4.23,<5` | Validação dos argumentos contra o schema do MCP |
| `pillow` | `>=12,<14` | Validação, orientação, redução e remoção de metadados das fotos |

Python **3.11+** (a verificação foi feita com 3.14). O código usa
`BaseExceptionGroup`, disponível a partir do 3.11.

## Parâmetros fixos no código

| Parâmetro | Valor | Onde |
|---|---|---|
| Timeout do agente | 90 s | `main.py` |
| Turnos máximos do agente | 6 | `agent.py` (`max_turns`) |
| Tokens máximos de saída | 2200 | `agent.py` (`ModelSettings`) |
| Buscas por execução | 3 | `MAX_MARKET_SEARCHES_PER_RUN` |
| Resultados por busca | 5 | `ifood_mcp.py` (`pageSize`) |
| Timeout HTTP do MCP | 30 s (60 s de leitura) | `ifood_mcp.py` |
| Retries de transporte | 1 (após 0,2 s) | `ifood_mcp.py` |
| Timeout HTTP do OAuth | 15 s | `oauth.py` |
| Validade da tentativa de login | 600 s | `ATTEMPT_TTL_SECONDS` |
| Antecedência do refresh | 300 s antes de expirar | `oauth.py` |
| TTL da sessão | 1800 s, deslizante | `ConversationStore` |
| Sessões máximas | 100 (descarta a mais antiga) | `ConversationStore` |
| Histórico por sessão | 12 turnos | `ConversationStore.commit` |
| Origens CORS | `localhost:5173`, `127.0.0.1:5173` | `main.py` |
| Tamanho máximo da foto | 5 MB (`MAX_IMAGE_BYTES`) | `vision.py` |
| Resolução máxima da foto | 20 megapixels (`MAX_IMAGE_PIXELS`) | `vision.py` |
| Lado máximo enviado ao modelo | 2048 px, JPEG qualidade 85 | `vision.py` |
| Agente de captura | 1 turno, 1800 tokens, timeout 90 s | `vision.py`, `main.py` |

## Veja também

- [Como rodar](../06-operacao/como-rodar.md)
- [Autenticação OAuth](autenticacao-oauth.md)
