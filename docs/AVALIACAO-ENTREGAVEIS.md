# Avaliação dos entregáveis obrigatórios

Análise feita em 17/10/2026 (noite), com base na página oficial do evento
(*Hackathon SEMCOMP & iFood 2026 — Vendendo com Agentes*, seção "Entregáveis
obrigatórios") e no estado da branch `develop` (commit `efd7f57`).

Submissão: **domingo, 18/10, às 12h30**.

## Resumo

Nenhum dos seis entregáveis está totalmente ausente, mas apenas um (Interface
Visual) está pronto para submissão. O conteúdo dos demais existe de forma
fragmentada em documentos internos de planejamento; a banca precisa de seis
peças claras e autocontidas. Além disso, há uma lacuna em relação à missão do
desafio: o fechamento do carrinho.

## Situação por entregável

| # | Entregável | Situação | Onde está hoje | O que falta |
|---|---|---|---|---|
| 01 | Proposta de Negócio | 🟡 Parcial | `docs/HACKATHON_CONTEXT.md` §2 (problemas e proposta de valor) | O arquivo é um "contexto mestre" interno, com instruções para o Codex (§14). Precisa virar um documento próprio: problema, público, proposta de valor e diferencial. |
| 02 | Desenho de Solução | 🟡 Parcial | `docs/HACKATHON_CONTEXT.md` §4 e §10, `docs/RESUMO-GERAL-DO-SISTEMA.md` §5, `frontend/README.md` (Fluxo) | Disperso em quatro lugares e sem diagrama. Falta um fluxo único: usuário → frontend → backend → agente → MCP. |
| 03 | Racional da Experiência | 🔴 Fraco | `docs/HACKATHON_CONTEXT.md` §10 | Há diretrizes ("deve…"), não a justificativa das decisões tomadas. Falta explicar o porquê do fluxo em etapas em vez de chat, da correção de ingredientes, das etiquetas declarado/inferido/MCP, das tags de perfil e da câmera opcional. |
| 04 | Interface Visual | 🟢 OK | `frontend/` (React, etapas Capture → Review → Tags → Options → Market → Done) | Apenas capturas de tela ou GIF para anexar à submissão. |
| 05 | Documento Técnico Resumido | 🟡 Parcial | `backend/README.md`, `docs/IMPLEMENTACAO-AGENTE.md`, `docs/PLANO-BACKEND.md` | `PLANO-BACKEND.md` tem 502 linhas e é um plano, não um retrato do que existe. Falta uma síntese de 1–2 páginas: arquitetura, tools do MCP usadas, OAuth, decisões. Verificar também se `backend/README.md` está desatualizado (diz que não há upload de imagem, mas o commit `eeb141d` integrou câmera e upload). |
| 06 | Feedback sobre os MCPs | 🟡 Parcial | `docs/IMPLEMENTACAO-AGENTE.md` (divergência `refinements.dietary` × `refinements.itemRestrictions`; `getItem`/`getMerchant` não anunciadas), `docs/RESUMO-GERAL-DO-SISTEMA.md` §8 | Achados reais existem, mas espalhados. A proposta de perfis/tags pedida pelos mentores não foi escrita no formato definido em `HACKATHON_CONTEXT.md` §8: problema, caso de uso, limitação, contrato, benefícios e LGPD. |

## Risco principal: fechamento do carrinho

A missão do desafio é construir *"um agente que faz pedidos de verdade… da
escolha do restaurante ao **fechamento do carrinho**"*. Hoje o projeto não faz
isso, de forma explícita:

- `backend/app/agent.py:77`: "Carrinho, voucher, checkout e compra não são ferramentas deste agente"
- `frontend/src/steps/MarketStep.tsx:289`: "Criar o carrinho e finalizar a compra ainda não estão disponíveis nesta versão"
- `backend/README.md` (Limites do MVP): "Não há carrinho, checkout, escrita no MCP"

Isso pesa diretamente no critério **Arquitetura & Engenharia** ("uso correto do
MCP do iFood") e na aderência à missão.

**Recomendação:** tentar, antes da submissão, ao menos a montagem do carrinho
via MCP de carrinho (`mcps/cart/tools` na documentação oficial), com
confirmação explícita do usuário, mesmo sem finalizar o pedido. Se não for
viável a tempo, assumir a limitação e o motivo no pitch e no entregável 06, em
vez de deixar a banca descobrir.

## Outros pontos

- **Foto quebrada ponta a ponta:** o frontend chama `POST /api/context/parse-image`
  (`frontend/src/api.ts:83`), mas o endpoint não existe no backend em nenhuma
  branch. Implementar ou usar só o caminho por texto na demo.
- O `README.md` da raiz tem 3 linhas. Deveria ser a porta de entrada da
  submissão, com links para os seis entregáveis.
- O pitch não é um entregável listado, mas é critério de avaliação (5 min de
  apresentação + 3 min de perguntas). Não há roteiro nem slides no
  repositório; `HACKATHON_CONTEXT.md` §13 já traz a estrutura sugerida.

## Próximos passos sugeridos

1. Criar `docs/entregaveis/` com `01-proposta-negocio.md` … `06-feedback-mcp.md`,
   reaproveitando o conteúdo existente e preenchendo as lacunas acima.
2. Atualizar o `README.md` da raiz para apontar para esses seis arquivos.
3. Decidir sobre o carrinho (implementar ou documentar a limitação).
4. Gerar capturas de tela do frontend para o entregável 04.
5. Montar o roteiro do pitch.
