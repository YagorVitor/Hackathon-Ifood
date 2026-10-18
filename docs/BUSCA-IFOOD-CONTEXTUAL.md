# Busca contextual no iFood

Atualização solicitada pela equipe em 18/10/2026: Mercado continua sendo adequado
para ingredientes e reposição; conveniência também considera restaurantes e o
catálogo geral. O núcleo permanece: compreender a despensa e comprar só quando
necessário. Este refinamento amplia o canal comercial sem substituir a proposta
validada em `HACKATHON_CONTEXT.md`.

## Implementação

- `searchOffers` com `resultKind=ITEM` e `merchantType` opcional, validado pelo
  schema anunciado em `tools/list`. Sem vertical, consulta o catálogo geral.
- A ferramenta local `search_market_items` mantém o nome para compatibilidade,
  mas aceita `merchant_type`: RESTAURANT, GROCERIES, LIQUORSTORE, DRUGSTORE,
  PETSTORE ou SHOPPING. O agente escolhe conforme a necessidade explícita.
- Ingredientes favorecem GROCERIES; refeições/acompanhamentos prontos favorecem
  RESTAURANT ou busca geral. A busca não transforma automaticamente um ingrediente
  em refeição pronta. Medicamentos e tratamentos não são recomendados por essa expansão.
- Todas as consultas usam `onlyOpen=true`. Resultados explicitamente marcados
  `isOpen=false` são descartados. Isso não garante estoque ou disponibilidade final.
- Resposta vazia numa vertical amplia uma vez o mesmo termo para todas as verticais,
  preservando destino, filtros e orçamento. Falha de transporte/schema/permissão
  não dispara ampliação nem é apresentada como catálogo vazio.
- Limite de três consultas MCP por execução, incluindo ampliações, com cache por
  termo/vertical. Não remove filtros para obter mais resultados.
- O registro de buscas expõe `vertical` (null significa todas), mantendo contratos
  de estratégias e carrinho existentes. IDs comerciais continuam vindo do MCP.
- A interface explica a busca no iFood. Sem ingredientes encontrados, oferece
  planejar alternativas prontas, que a pessoa escolhe antes de uma nova busca.
- Nenhum horário é usado para inventar disponibilidade. Uma busca vazia não prova
  que todas as lojas fecharam. Não foram adicionadas permissões OAuth novas.

## Validação

53 testes offline: busca geral e por vertical conforme schema capturado, filtro
onlyOpen, ampliação com cache e orçamento de consultas, preservação de restrições,
erros distintos de vazio e descarte de parceiros explicitamente fechados. Build
TypeScript/Vite. Nenhum carrinho real foi criado para verificar esta alteração.

Fonte oficial consultada:
https://mcp-developer.ifood.com.br/pt-BR/docs/guides/mcps/discovery/tools
