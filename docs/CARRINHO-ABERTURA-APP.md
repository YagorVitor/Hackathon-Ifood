# Carrinho MCP e abertura no aplicativo

## Problema observado

A interface orientava abrir o aplicativo genericamente e dizia que o carrinho
estava conferido mesmo quando getCart falhava. O backend descartava appDeeplink.
Não houve confirmação de sincronização automática com a sacola principal do app.
Isso explica uma falha de orientação; não prova a causa do carrinho específico
relatado pela equipe, cuja resposta MCP não foi recuperada nesta investigação.

## Correção

- Preservar appDeeplink de getCart, com fallback ao link de createCart.
- Só aceitar links em esquemas/hosts oficiais; nunca fabricar URL com cartId.
- Mostrar botão para abrir aquele carrinho quando houver link retornado pelo MCP.
- Distinguir confirmed (mesmo cartId, estabelecimento quando informado, itens e
  quantidades), unverified (somente criação) e mismatch (leitura divergente).
- Não afirmar que a sacola do aplicativo foi sincronizada.
- Carrinho criado, inclusive quando getCart retorna vazio, continua registrado
  na proposta, para repetição da confirmação não criar outro carrinho.
- Pagamento e envio de pedido continuam fora deste fluxo. Nenhuma nova operação
  comercial foi executada para investigar esta ocorrência.

Para investigar um caso real: guardar o identificador exibido nos detalhes,
consultar getCart sem criar novamente e usar o appDeeplink retornado, no celular
com a mesma conta OAuth. Sem esse retorno, não afirmar causa de ambiente de teste,
sessão diferente ou sincronização.

Fonte oficial: https://mcp-developer.ifood.com.br/pt-BR/docs/guides/mcps/cart/tools

Rota de diagnóstico: `GET /api/cart/{cart_id}` (UUID). Exige conexão OAuth,
chama somente getCart e retorna itens/quantidades e link oficial validado. Não
retorna dados de endereço, pagamento ou resposta bruta; usa Cache-Control:no-store.
Continua sujeito à limitação de sessão única local descrita no projeto.
