# Falas para a apresentação

## Página 5: arquitetura e MCP

Usamos o OpenAI Agents SDK para interpretar o contexto e recomendar opções. O agente consulta ofertas pelo MCP oficial do iFood, por meio do nosso backend. Produtos, lojas e preços vêm dessas respostas. O backend valida os dados e mantém o controle da ação: só cria o carrinho depois da confirmação do usuário e consulta o resultado para conferir os itens. Preferências ficam na CompletAI, com autorização. O MVP chega ao carrinho conferido, sem pagamento ou envio de pedido.

## Transição para as telas

“Agora vamos acompanhar esse caminho nas telas da aplicação.”

## Página 9: Entrada e contexto

Aqui começa a experiência. A pessoa escreve ou envia uma foto, com o objetivo da refeição. A conexão iFood pode ser feita desde o início.

## Página 10: Revisão dos alimentos

A foto gera uma lista para revisão. A pessoa corrige os alimentos antes de continuar. Assim, uma interpretação errada não vira automaticamente uma compra.

## Página 11: Sugestões do agente

Para esse almoço em família, o agente sugere aproveitar o que já existe, completar com espaguete no iFood Mercado ou escolher uma refeição pronta. Vamos seguir com o espaguete.

## Página 12: Destino da compra

A opção escolhida já autoriza a busca. Com a conta conectada e o endereço definido, o agente procura ofertas para esse destino.

## Página 13: Oferta do iFood

Aqui temos uma oferta retornada pelo MCP. A pessoa confere o produto, a quantidade e as condições da loja antes de montar o carrinho. O preço do item ainda não é o total final da compra.

## Página 14: Resultado do carrinho

Depois da revisão e da confirmação, o backend cria o carrinho e consulta o resultado. Esta tela confirma os itens e as quantidades. O total não foi informado pelo MCP, e nenhum pedido foi enviado. Esse é o ponto de chegada do nosso MVP.

## Encerramento após as telas

“A CompletAI conecta uma necessidade do cotidiano a uma oferta relevante no iFood, com o usuário no controle da decisão.”
