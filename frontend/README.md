# Front-end — Despensa Reversa

React + Vite + TypeScript + Tailwind v4. Mobile-first, pt-BR, temas claro/escuro pelo sistema.
Sem dados simulados: tudo vem do backend (`feature/backend`) por `POST /api/agent/message`.

## Rodar

1. Backend (branch `feature/backend`, pasta `backend/`), conforme `backend/README.md`:

   ```bash
   uvicorn app.main:app --env-file .env --host 127.0.0.1 --port 8000 --no-access-log
   ```

2. Frontend:

   ```bash
   npm install
   npm run dev   # http://localhost:5173
   ```

O Vite faz proxy de `/api`, `/auth` e `/health` para `localhost:8000`. Nenhuma credencial fica no
frontend: OAuth do iFood e chave da OpenAI vivem só no backend.

## Fluxo (docs/HACKATHON_CONTEXT.md §4 e §10)

1. **Contar** — texto livre. O agente devolve ingredientes reconhecidos (`INFERRED`, não confirmados).
2. **Conferir** — a pessoa corrige, completa ou remove itens e, se quiser, declara objetivo, pessoas,
   tempo e orçamento. Só então os itens viram `inventario_confirmado`.
3. **Perfil** — só aparece quando o agente pergunta (`pergunta_tags=true`). Preferências (vegetariano/vegano)
   separadas de alergias, intolerâncias e saúde, que exigem consentimento explícito. “Prefiro não informar”
   envia `estado=DECLINED` e o agente não pergunta de novo.
4. **Sugestões** — opções `USE_WHAT_I_HAVE`, `COMPLETE_WITH_MARKET` ou `CONVENIENCE` geradas pelo agente.
5. **Mercado** — com a conta iFood conectada (login em nova aba via `/auth/login`) e uma localização escolhida
   (geolocalização do navegador ou coordenadas), o agente busca os faltantes via `searchOffers`. A UI mostra
   produtos, preços, frete, custo conhecido (estimativa) e as consultas feitas. Não há carrinho nem compra.

Etiquetas de procedência: **Você informou**, **Sugerido pela IA**, **Dado do iFood (MCP)**, **Estimativa**.

Cada chamada é stateless (`remember_context=false`): o frontend reenvia o contexto completo e o backend
não guarda a conversa. Perfil e dados sensíveis ficam só na memória da aba (sem `localStorage`).

## Verificação

```bash
npm run build   # tsc -b + vite build
```
