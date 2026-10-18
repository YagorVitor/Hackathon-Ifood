# Endereço antes da busca e vínculo com o carrinho

Correção sobre `feature/carrinho`, em 18/10/2026.

## Comportamento

- Os endereços são consultados no Mercado, antes de buscar produtos para entrega.
- Um endereço único é selecionado e informado; com vários, a pessoa escolhe um.
- As coordenadas vêm do endereço retornado pelo iFood. Um endereço sem coordenadas
  válidas não habilita carrinho.
- Erro, carregamento e sucesso vazio são estados separados. Uma falha nunca diz
  que a conta não tem endereços.
- Trocar/atualizar o destino descarta resultados e produtos preparados para carrinho.
  Respostas atrasadas da busca anterior são ignoradas.
- O carrinho mostra o mesmo destino da busca. Trocar endereço retorna ao Mercado,
  exige escolher o destino e refazer a consulta.
- Ainda é possível explorar ofertas por localização, sem destino salvo; esse
  caminho não habilita criação de carrinho. Não existe cadastro de endereço no app.

## Validação no backend

`/api/addresses` exige sessão e verifica se a configuração solicita
`mcp.user.addresses.read`. Uma configuração incompleta retorna erro acionável,
não uma lista vazia. A configuração não prova concessão: a ferramenta também
precisa ser anunciada pelo MCP autenticado. Falhas HTTP 401/403 e timeouts
agrupados no transporte são classificados sem expor URLs, tokens ou corpos.

O backend mantém snapshots temporários dos endereços consultados (10 minutos)
e associa cada produto observado à localização da busca. Proposta e confirmação
validam o endereço conhecido e a correspondência das coordenadas. Endereço
inventado, expirado, alterado ou produto de busca sem destino compatível é recusado.

Este controle continua no protótipo local de usuário único. Não substitui isolamento
de sessões para produção, verificação de disponibilidade no iFood ou o total real
do carrinho. Criar carrinho ainda depende de confirmação explícita.

## Configuração e operação

O gateway permanece `https://consumer-mcp.ifood.com.br/marketplace`.
Não foram alterados segredos nem ampliados escopos automaticamente. A instalação
que executa a feature precisa solicitar os escopos homologados necessários para
`listAddresses`, `createCart` e `getCart`; reiniciar o backend e refazer o OAuth
após alterar a configuração. Conferir sempre o `tools/list` autenticado.

Referências oficiais consultadas:

- [User MCP](https://mcp-developer.ifood.com.br/pt-BR/docs/guides/mcps/account/introducao)
- [Escopos](https://mcp-developer.ifood.com.br/pt-BR/docs/guides/authentication/escopos)
- [Gateway único](https://mcp-developer.ifood.com.br/pt-BR/docs/guides/first-steps/install-mcp)

## Validação offline

Suíte Python com dados sintéticos: erro versus vazio, configuração sem escopo,
recusa de destino alterado/desconhecido/expirado, coordenadas ausentes e erros HTTP.
No navegador, servidor de fixtures sem acesso ao iFood: falha de endereços,
recuperação, múltiplos destinos, busca para cada destino, preservação no carrinho,
descarte ao trocar e resposta vazia bem-sucedida. Nenhum carrinho real foi criado.
