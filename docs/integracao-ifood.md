# Integração MCP

O adaptador está em `backend/app/ifood_mcp.py`. Usa o SDK Python oficial,
`mcp.Client`, com Streamable HTTP e token OAuth no cabeçalho Bearer. Cada operação
abre e fecha o cliente HTTP e a sessão MCP por um gerenciador de contexto.
Timeout: 30 s geral e 60 s de leitura.

## Descoberta e validação

`GET /api/integration/tools` consulta `tools/list` da conta conectada e devolve
nome, descrição e `inputSchema`. O adaptador percorre `next_cursor` até o fim e
rejeita cursores repetidos, evitando uma consulta sem término.

`call_tool` é o caminho comum de descoberta, validação e execução. Antes da
chamada, verifica se a ferramenta foi anunciada e valida os argumentos pelo
`inputSchema` daquela conexão. Não tenta formatos alternativos nem repete
escritas. A ausência de uma ferramenta gera erro, sem substituir a operação por
uma API não documentada.

As ferramentas disponíveis dependem da conexão e dos escopos autorizados. Pagamento e envio de pedido ficam fora do MVP.

## Operações usadas

| Ferramenta | Uso no produto | Controle |
|---|---|---|
| `searchOffers` | Buscar ingredientes, refeições e acompanhamentos | Somente leitura; até três consultas por execução |
| `listAddresses` | Selecionar endereço salvo | Endereço de uma conexão anterior é descartado |
| `createCart` | Criar o carrinho revisado | Confirmação explícita e uma escrita por proposta |
| `getCart` | Conferir carrinho criado | Compara identidade, itens e quantidades com a proposta |

O agente recebe apenas a função local `search_market_items`, que chama
`searchOffers`. As outras operações pertencem ao backend determinístico.
`search_groceries` é usado pela rota de diagnóstico `/mcp/test-search` e fixa
`merchantType=GROCERIES`; o agente usa `search_items`, que aceita uma vertical
opcional.

## Busca

- Termo descritivo em `query`; preço, frete e restrições em `refinements`.
- `resultKind=ITEM`, `pageSize=5` e `refinements.onlyOpen=true`.
- `merchantType=GROCERIES` para ingredientes; `RESTAURANT` para opções prontas,
  quando pertinentes. Sem vertical, consulta o catálogo geral.
- `userLocation` vem do contexto validado. Carrinho exige busca para as mesmas
  coordenadas do endereço selecionado.
- O schema anunciado utiliza `itemRestrictions`. A aplicação valida esse campo
  no runtime, sem substituir pelo nome `dietary` encontrado no guia.
- Cache evita consultas idênticas. Uma falha de transporte permite uma segunda
  tentativa de leitura; erro de schema ou negócio não gera retry.

O modelo seleciona referências `offer_N`. O backend preenche nomes, IDs e preços
somente com os produtos observados nesta execução. `structured_content` e o
bloco textual JSON são aceitos; erros inline não viram catálogo vazio.

## Carrinho

`createCart` recebe `merchantId`, `addressId` e `items`, com `itemId`, `quantity`
e `options: []` em cada item. Os IDs vêm da busca e de `listAddresses`, não da
interpretação livre do modelo. A proposta possui validade, hash e evidências
recentes de uma única loja.

Cada confirmação autoriza uma criação. Timeout, cancelamento ou resposta sem
identificador deixam a escrita incerta e bloqueiam a repetição automática.
Se a criação devolveu o ID e a leitura falhou, o backend preserva o carrinho
criado em vez de chamar `createCart` novamente.

O parser usa `unitPrice` e os campos documentados de `summary`:
`subtotalAmount`, `deliveryFeeAmount` e `totalAmount`. Benefícios e voucher
compõem o desconto quando ambos são informados. Não calcula um total final para
substituir um valor ausente do iFood. O aviso singular `warning` também é lido.

`appDeeplink` só é repassado quando retornado pelo MCP e aceito pela validação de
URL. Nenhum link é inventado. Criar um carrinho não comprova sua presença na
sacola principal do aplicativo, nem envia um pedido.

## Erros e dados sensíveis

Falhas de autenticação e permissão preservam os status 401/403. Timeout responde
504; falhas de protocolo ou formato respondem 502. O adaptador registra apenas o
nome da ferramenta e o tipo da exceção, sem tokens, endereços ou corpo bruto.
OAuth, coordenadas e credenciais ficam fora do contexto do modelo.

## Referências

- [Offer Discovery MCP: Tools](https://mcp-developer.ifood.com.br/pt-BR/docs/guides/mcps/discovery/tools)
- [Cart MCP: Tools](https://mcp-developer.ifood.com.br/pt-BR/docs/guides/mcps/cart/tools)
- Schemas capturados: `backend/tests/fixtures/search_offers_schema.json` e
  `backend/tests/fixtures/create_cart_schema.json`.

## Autorização e troca de conta

O fluxo OAuth usa Authorization Code com PKCE S256, validação de `state` e tentativas com validade de 10 minutos. Os endpoints do provedor são `https://id.ifood.com.br/authorize` e `https://id.ifood.com.br/token`. O token é renovado quando necessário; `/auth/status` também verifica essa renovação antes de informar que a conta está conectada.

Os escopos e o callback são configurados conforme o [guia de execução](../README.md). Após mudar credenciais ou escopos, reinicie o backend e conecte novamente. A autorização precisa ter sido concedida no portal.

Cada login muda `connection_id` e limpa o estado comercial anterior. O frontend descarta endereços e ofertas da conexão antiga, incluindo respostas atrasadas. Esse identificador não representa uma conta própria da CompletAI.

## Endereço e confirmação

Os endereços consultados ficam disponíveis por 10 minutos. A proposta exige um endereço conhecido, com coordenadas válidas, e produtos encontrados para essas mesmas coordenadas. Trocar o destino exige refazer a busca. Explorar por localização sem endereço salvo não habilita a criação de carrinho.

A proposta expira em 10 minutos e as evidências de catálogo em 30 minutos. `snapshot_hash` vincula a confirmação ao conteúdo revisado. A conferência distingue `confirmed`, `unverified` e `mismatch`; falha de leitura após criação preserva o identificador obtido.
