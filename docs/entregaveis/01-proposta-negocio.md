# 01. Proposta de negócio

## Uma intenção de compra antes da busca

“Quero um jantar rápido para duas pessoas, gastando até R$ 35.” O cliente sabe o que precisa resolver, mas ainda precisa decidir o que preparar, encontrar os produtos e comparar opções.

A CompletAI ajuda nessa decisão. Recebe o contexto por texto, foto ou ditado, considera as preferências informadas e sugere alternativas. A compra pode ser um ingrediente no iFood Mercado, uma refeição pronta ou um acompanhamento de restaurante.

Para o cliente, a proposta é chegar a uma escolha com menos esforço. Para o iFood, é aproximar o catálogo de quem tem uma intenção de consumo, mas ainda não sabe o que buscar.

## Como a solução gera valor

O agente parte da ocasião, do tempo disponível, do orçamento e do que a pessoa já tem. O orçamento orienta a recomendação e os filtros, mas o total depende dos itens, das quantidades e das taxas informadas pelo iFood. A partir disso, recomenda opções e busca ofertas quando o usuário escolhe comprar. Produtos, lojas e preços vêm do MCP oficial do iFood. O carrinho é criado após a revisão e a confirmação do usuário.

Mesmo uma refeição que dispensa ingredientes adicionais pode abrir espaço para uma bebida, sobremesa ou acompanhamento. A CompletAI já apresenta essas sugestões como opcionais. O caminho dedicado para selecionar e comprar esses extras em opções sem faltantes ainda precisa ser concluído.

## Como avaliar o resultado

A hipótese comercial é que sugestões ligadas à ocasião levem a mais buscas e carrinhos. Para testá-la, propomos acompanhar:

- Quantas sessões de recomendação avançam para uma busca no iFood.
- Quantas buscas resultam em carrinho criado e conferido.
- Quanto tempo a pessoa leva até confirmar o carrinho.
- Em quais etapas ela desiste e quais falhas interrompem o fluxo.
- Quantas pessoas escolhem um complemento, após a conclusão desse caminho de compra.

Essas métricas ainda precisam ser instrumentadas. O projeto não tem resultados medidos de conversão ou faturamento; o valor de um carrinho representa uma intenção de compra.

## Entrega atual

O MVP funciona localmente, parte de ingredientes confirmados e oferece um caminho até a criação e conferência do carrinho. A versão atende uma conta iFood por processo do backend. Pagamento, envio do pedido e histórico persistente de compras ficam fora desta entrega.

## Referências no projeto

[Regras do agente](../../backend/app/agent.py), [sugestões](../../frontend/src/steps/OptionsStep.tsx) e [fluxo da aplicação](../../frontend/src/App.tsx).
