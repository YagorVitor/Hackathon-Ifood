# 06. Feedback sobre os MCPs

A integração da CompletAI trouxe seis pontos que podem facilitar o desenvolvimento de agentes e tornar o fluxo comercial mais previsível. As observações se referem às capacidades utilizadas pelo projeto.

## Preferências que acompanhem o usuário

Hoje, a CompletAI mantém seu próprio perfil. O fluxo implementado não consulta nem grava um perfil contextual pelo MCP: a aplicação mantém essas informações no navegador e as envia ao agente com autorização. Nossa proposta é avaliar como esse contexto poderia ser reutilizado entre agentes autorizados. A análise do código não permite afirmar que essa capacidade esteja ausente de todos os serviços do iFood.

O catálogo já aceita filtros alimentares por `refinements.itemRestrictions`. A necessidade é permitir que preferências como vegetariano ou vegano sejam lembradas e reutilizadas com autorização do usuário.

Sugerimos avaliar um perfil com operações de consulta, atualização e exclusão. Alergias e informações de saúde precisam de consentimento e tratamento separados. Os filtros de catálogo, por sua vez, não comprovam ausência de alérgenos ou de contaminação cruzada.

## Permissões mais fáceis de diagnosticar

Concluir o login não significa que todas as ferramentas estarão disponíveis. Na CompletAI, consultamos `tools/list` e validamos os argumentos antes de executar uma operação.

Sugerimos reunir, junto ao diagnóstico da conexão, a relação entre ferramenta, escopo, ambiente e necessidade de homologação. Mensagens que diferenciem falta de permissão, ferramenta indisponível e falha do serviço também reduziriam o tempo de diagnóstico.

## Clareza sobre o destino do carrinho

Criar um carrinho e consultá-lo por identificador não esclarece, por si só, onde o usuário poderá encontrá-lo no aplicativo. A integração também precisa lidar com respostas sem um link válido para abertura.

Sugerimos explicitar a relação entre o carrinho criado pelo MCP e a sacola do app, incluindo as condições de abertura e continuidade. Exemplos com e sem link ajudariam a orientar a interface e a mensagem exibida ao usuário.

## Recuperação após uma criação incerta

Se a conexão é interrompida depois de enviar a criação, a aplicação pode não saber se a operação foi concluída. Repetir a chamada pode criar outro carrinho. Por isso, a CompletAI bloqueia a repetição automática quando o resultado é incerto.

Seria útil destacar um procedimento para recuperar o resultado quando a resposta da criação não chega ao cliente. Uma chave de idempotência ou um identificador para reconciliação são possibilidades a avaliar, sem presumir que já estejam disponíveis.

## Respostas comerciais consistentes

A aplicação precisa distinguir preço unitário de total, valor ausente de zero e sucesso com avisos de uma falha. O código trata esses casos e preserva como desconhecidos os totais que não foram informados.

Schemas de resposta acompanhados de exemplos de sucesso, resultado parcial e erro facilitariam a implementação. Cada campo monetário deve deixar clara sua unidade e o que está incluído no valor.

## Um exemplo completo com endereço

A busca usa coordenadas, enquanto a criação do carrinho usa um endereço. Na CompletAI, os produtos encontrados ficam associados ao destino da consulta para evitar uma compra com dados de outra região.

Um exemplo completo, da escolha do endereço até a conferência do carrinho, ajudaria a implementar essa ligação. Ele poderia incluir respostas para destino incompatível, ausência de ofertas e falta de permissão.

## Referências no projeto

[Filtros de catálogo](../../backend/app/recommendations.py), [adaptador MCP](../../backend/app/ifood_mcp.py) e [conferência do carrinho](../../backend/app/cart.py).
