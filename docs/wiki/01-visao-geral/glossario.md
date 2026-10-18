# Glossário

| Termo | Significado |
|---|---|
| **MCP** | *Model Context Protocol*. Protocolo que expõe ferramentas para agentes de IA. O iFood oferece um MCP oficial para consumidores. |
| **Gateway MCP** | Endereço do MCP do iFood usado pelo backend: `https://consumer-mcp.ifood.com.br/marketplace`. |
| **`tools/list`** | Chamada MCP que lista as ferramentas disponíveis na sessão autenticada, com seus schemas de entrada. |
| **`searchOffers`** | Ferramenta MCP de descoberta de ofertas. É a única que o projeto usa. |
| **`search_market_items`** | Ferramenta local que o agente enxerga. Por baixo, chama `searchOffers` com os filtros do contexto. |
| **`GROCERIES`** | Valor de `merchantType` que restringe a busca ao iFood Mercado. |
| **`resultKind=ITEM`** | Faz a busca devolver produtos, e não lojas. |
| **`itemRestrictions`** | Filtro de catálogo do `searchOffers` (VEGETARIAN, VEGAN, LAC_FREE, GLUTEN_FREE, SUGAR_FREE, ORGANIC). |
| **OAuth PKCE** | Fluxo OAuth 2.0 com *Proof Key for Code Exchange*. É como o consumidor autoriza o backend a usar o MCP em seu nome. |
| **Agents SDK** | Biblioteca `openai-agents` usada para rodar o agente com ferramentas e saída estruturada. |
| **Envelope** (`AgentEnvelope`) | Tudo que o agente recebe numa execução: mensagem, contexto e histórico resumido. |
| **Rascunho** (`AgentDraft`) | Saída bruta do modelo. Não contém nomes, IDs nem preços de produtos. |
| **Saída** (`AgentOutput`) | Resposta final, depois que o backend valida o rascunho e preenche os dados comerciais. |
| **Contexto** (`UserContext`) | Inventário confirmado, tags, objetivo, pessoas, tempo, orçamento, localização e critérios de busca. |
| **Inventário confirmado** | Ingredientes que a pessoa confirmou na revisão. É a única fonte do que "já existe em casa". |
| **Contexto reconhecido** (`contexto_reconhecido`) | Objetivo, pessoas, tempo e orçamento que o agente extraiu do texto. Fica `INFERRED` e não confirmado até a pessoa revisar; nunca altera filtros sozinho. |
| **Data URL** | Imagem codificada em base64 dentro de um texto (`data:image/jpeg;base64,...`). É como o frontend envia a foto. |
| **Agente de captura** | Segundo agente, sem ferramentas, que transforma uma foto em ingredientes para revisão. Ver [Reconhecimento de imagem](../04-agente/reconhecimento-de-imagem.md). |
| **Ingrediente reconhecido** | Ingrediente que o agente extraiu do texto. Fica como `INFERRED` até ser confirmado. |
| **Tags declaradas** (`DeclaredTags`) | Preferências (vegetariano, vegano, orgânico) e restrições sensíveis (alergias, intolerâncias, condições de saúde). |
| **Estado das tags** | `NOT_ASKED`, `ASKED`, `ANSWERED` ou `DECLINED`. Controla se o agente pode perguntar sobre preferências. |
| **Consentimento** | `consentimento_dados_sensiveis`. Sem ele, a API rejeita alergias, intolerâncias e condições de saúde. |
| **Estratégia** | `USE_WHAT_I_HAVE`, `COMPLETE_WITH_MARKET` ou `CONVENIENCE`. Ver [Produto](produto.md#as-três-estratégias). |
| **Faltante** | Ingrediente que a refeição precisa e que não está no inventário confirmado. |
| **Referência `offer_N`** | Identificador local de um produto observado numa execução. O modelo seleciona produtos por essa referência. |
| **Produto observado** (`ObservedProduct`) | Produto devolvido pelo MCP, com preço, frete e mínimo **observados** naquele momento. |
| **Evidência de busca** (`SearchEvidence`) | Registro de cada busca: termo, filtros aplicados, status (`success`, `empty`, `error`) e quantidade. |
| **Procedência** (*provenance*) | Origem de um dado: `DECLARED` (você informou), `INFERRED` (IA), `MCP` (iFood) ou `ESTIMATED` (cálculo). |
| **Centavos** | Todo valor monetário da aplicação é inteiro em centavos (`3500` = R$ 35,00). |
| **Total conhecido** | Soma de preços e fretes observados. Nunca é o total final do pedido (`total_final` é sempre `false`). |
| **Sessão** | Conversa guardada no backend quando `remember_context=true`. TTL de 30 min. |
