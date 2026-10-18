# Estado atual

Retrato do que existe no código da branch `develop` (commit `218a98c`,
17/10/2026, com o merge de `codex/mvp-finalizacao`).

## Matriz de funcionalidades

| Funcionalidade | Estado | Onde |
|---|---|---|
| Entrada por texto | ✅ Funciona | `frontend/src/steps/CaptureStep.tsx` → `POST /api/agent/message` |
| Extração de ingredientes pelo agente | ✅ Funciona | `ingredientes_reconhecidos` em `AgentOutput` |
| Revisão e correção dos ingredientes | ✅ Funciona | `frontend/src/steps/ReviewStep.tsx` |
| Preferências e restrições com consentimento | ✅ Funciona | `DeclaredTags`, `consentimento_dados_sensiveis` |
| Sugestões nas três estratégias | ✅ Funciona | `MealOption.estrategia` |
| OAuth PKCE do consumidor iFood | ✅ Funciona | `backend/app/oauth.py` |
| Busca no iFood Mercado via MCP | ✅ Funciona | `backend/app/ifood_mcp.py`, tool `searchOffers` |
| Custos conhecidos por opção | ✅ Funciona | `backend/app/recommendations.py` |
| Sessão de conversa no servidor | ✅ Existe, não usada pelo frontend | `backend/app/context.py` (o frontend envia `remember_context=false`) |
| Câmera e upload de foto (interface) | ✅ Funciona | `frontend/src/components/PhotoInput.tsx` |
| Reconhecimento de foto no backend | ✅ Funciona (precisão em fotos reais não medida) | `backend/app/vision.py`, `POST /api/context/parse-image` |
| Detalhes do pedido extraídos automaticamente | ✅ Funciona | `contexto_reconhecido` em `AgentOutput` |
| Carrinho e pedido | ❌ Não implementado | O agente é somente leitura |
| Perfil persistente | ❌ Não implementado | Perfil só na memória da aba |
| Multiusuário | ❌ Não implementado | Tokens OAuth globais no processo |

## Lacunas conhecidas

### Foto: validada só com imagens de teste

O reconhecimento de foto funciona de ponta a ponta (ver
[Reconhecimento de imagem](../04-agente/reconhecimento-de-imagem.md)), mas foi
validado com imagens de teste. A precisão com fotos reais de despensa não foi
medida, e a câmera física num aparelho real ainda não foi testada. Tenha o
caminho por texto pronto como alternativa na demonstração.

### Sem carrinho

O desafio pede um agente que faça pedidos "até o fechamento do carrinho". Nesta
versão o fluxo termina na lista de produtos observados. A interface deixa isso
explícito (`frontend/src/steps/MarketStep.tsx`, card "Próximo passo").

### Um usuário por vez

Os tokens OAuth ficam em um único objeto no processo (`app.state.ifood_oauth`), e
todas as execuções do agente são serializadas por um lock global
(`ConversationStore.lock`). É um protótipo local; não deve ser exposto
publicamente assim.

## Verificações já feitas

Segundo [`docs/IMPLEMENTACAO-AGENTE.md`](../../IMPLEMENTACAO-AGENTE.md),
em 17/10/2026:

- 28 testes automatizados passando.
- OpenAI real: cenário sem compra, sem acionar o MCP.
- Foto: upload → API → OpenAI → revisão funcionou com uma imagem de teste; uma
  imagem sem alimentos devolveu lista vazia.
- MCP real autenticado: `tools/list` retornou `searchOffers`, `listVouchers` e
  `setVoucher`.
- Fluxo HTTP → agente → MCP real com coordenadas fictícias (0,0): HTTP 200,
  `mcpToolCalled=true`, `status=empty`, nenhum produto inventado.

Ainda falta validar uma busca com localização real e produtos disponíveis.

## Veja também

- [Limitações e roadmap](../06-operacao/limitacoes-e-roadmap.md)
- [`docs/AVALIACAO-ENTREGAVEIS.md`](../../AVALIACAO-ENTREGAVEIS.md)
