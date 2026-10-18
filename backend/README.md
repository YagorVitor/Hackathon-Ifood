# Backend e agente — CompletAI

Backend da `develop`, com FastAPI, Pydantic, OpenAI Agents SDK e MCP oficial
do iFood. O backend mantém o contexto em memória; cada execução do agente recebe
um envelope completo e devolve uma resposta estruturada.

## Executar

Python 3.11+ (verificado com Python 3.14).

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Preencher localmente IFOOD_CLIENT_ID, IFOOD_CLIENT_SECRET e OPENAI_API_KEY.
uvicorn app.main:app --env-file .env --host 127.0.0.1 --port 8000 --no-access-log
```

`.env` é ignorado pelo Git. O `--no-access-log` evita registrar códigos OAuth na
URL de callback. Não usar `--reload` durante a demo: tokens e sessões são apenas
em memória; reinício exige novo login. A configuração OpenCode usada nos testes
anteriores não é lida automaticamente pela aplicação; os valores entram por env.

Abra `/auth/login` (alias `/auth/ifood`) para o OAuth do consumidor. Callback
cadastrado: `http://localhost:8000/auth/callback`. Use os escopos técnicos aprovados;
o escopo verificado para busca é `mcp.discovery.search.read`.

## Contrato com o frontend

`POST /api/agent/message` (alias `/agent/test`) usa o mesmo handler:

```json
{
  "message": "Quero uma ideia de jantar usando o que tenho, sem comprar.",
  "remember_context": true,
  "context": {
    "inventario_confirmado": [
      {"nome": "arroz", "confirmado": true},
      {"nome": "ovos", "confirmado": true},
      {"nome": "tomate", "confirmado": true}
    ],
    "tags_declaradas": {"preferencias": ["VEGETARIAN"], "estado": "ANSWERED"},
    "objetivo": "jantar",
    "pessoas": 2,
    "tempo_min": 30,
    "orcamento_centavos": 3500
  }
}
```

Resposta: campos legados `response`, `mcpToolCalled`, `tool`, mais `session_id` e
`data` estruturado (`contract_version=1`, mensagem, pergunta_tags, ingredientes,
opções, produtos observados, buscas, custos e limitações). Todos os valores
monetários da aplicação são inteiros em centavos. A conversão de escalares BRL do
MCP usa Decimal. Opções/ingredientes do modelo têm origem INFERRED; produtos têm
origem MCP. Ingredientes reconhecidos precisam de confirmação na UI.

- Para continuar: `remember_context=true`, `session_id` retornado e nova `message`.
  `context` omitido conserva o anterior; quando informado, substitui o contexto
  inteiro. Não há merge parcial implícito. Chips/formulário enviam as tags.
- Tags: `NOT_ASKED` → `ASKED` quando o agente faz a pergunta. A UI envia
  `ANSWERED` ou `DECLINED`. Não se pergunta novamente em ASKED/ANSWERED/DECLINED.
- Alergias, intolerâncias e condições de saúde exigem
  `context.consentimento_dados_sensiveis=true`. Sem ele, a API rejeita esses
  campos. Ao revogar o consentimento no contexto, o histórico anterior é limpo.
- `remember_context` é opt-in para conservar contexto e textos da conversa,
  inclusive informações que a pessoa escrever. A interface precisa comunicar
  isso antes da escolha. Padrão false: nada é guardado. Não há perfil permanente.
- Sessões: TTL deslizante de 30 min, até 100 sessões e 12 mensagens de histórico.
  `DELETE /api/agent/sessions/{session_id}` apaga os dados. ID expirado/inexistente
  responde 404. Erros de execução não salvam o novo turno/contexto; revogação de consentimento é aplicada imediatamente, mesmo se o modelo falhar.
- Perfil e histórico pertencem ao backend. O agente recebe um `AgentEnvelope`
  completo por execução; não usa memória própria nem sessão da OpenAI.
- Busca exige `context.localizacao={latitude,longitude}` escolhida pelo usuário.
  `latitude`/`longitude` na raiz também são aceitos. O campo `query`, que era
  ignorado pelo agente, foi removido do contrato. Coordenadas não são inferidas nem enviadas ao
  modelo; só ao MCP. Ideias sem compra não exigem localização nem OAuth iFood.
- Sem chave OpenAI, a API retorna 503; busca sem OAuth retorna 401; timeout do
  agente retorna 504; falha de saída/modelo retorna 502. Dados comerciais de uma
  ferramenta com erro nunca são apresentados como sucesso.

## Filtros e limites comerciais

`preferencias`: VEGETARIAN, VEGAN, ORGANIC. Critérios explícitos adicionais em
`context.criterios_busca.restricoes_itens`: também LAC_FREE, GLUTEN_FREE, SUGAR_FREE.
Intolerâncias declaradas LACTOSE/GLUTEN, com consentimento, mapeiam os filtros
correspondentes. Alergia a leite não vira LAC_FREE. DIABETES não vira SUGAR_FREE.

Outros critérios: `preco_maximo_item_centavos`, `frete_maximo_centavos`,
`ordenar_por`. Orçamento também limita o preço de cada item, mas NÃO garante que
a soma caiba nele. O adaptador envia `refinements.itemRestrictions`, validado
contra o schema real anunciado; não usa `dietary` só porque aparece no guia.

`searchOffers` usa `resultKind=ITEM` e cinco resultados por busca. Ingredientes
usam `GROCERIES`; refeições prontas podem usar `RESTAURANT`. Sem vertical, a busca
consulta o catálogo geral. Apenas parceiros abertos são consultados (`onlyOpen=true`). Até três buscas distintas por execução; cache local evita
repetições. Mesmo invocações concorrentes respeitam o limite. Falhas de transporte em leitura têm até um retry; erros de schema/negócio não são repetidos. Ferramentas de
voucher anunciadas por `tools/list` não são expostas ao agente.

O modelo seleciona referências locais offer_N; nomes, IDs e preços dos produtos
são preenchidos pelo backend apenas a partir dos resultados desta execução.
IDs inventados, referências antigas e seleções sem faltante associado são
removidos. Custos são calculados por opção (alternativas não são somadas juntas),
com frete conhecido uma vez por loja; snapshots conflitantes deixam o frete
incompleto. Não há total final nem garantia de caber no orçamento: entrega,
mínimo e conversão de ingrediente em embalagem ainda precisam de revisão.

`GET /mcp/tools` (alias `/api/integration/tools`) lista capacidades desta sessão.
`POST /mcp/test-search` faz busca direta, sem LLM, com query/latitude/longitude e
`criteria` opcional. `GET /health` e `/healthz` são liveness.

## Verificação

```bash
python -m unittest discover -s tests -v
python scripts/export_contracts.py
```

Os testes usam dados comerciais **sintéticos** e substituem o Runner/modelo e o
transporte para validar API, regras, ferramenta local e limites sem custo de API.
`tests/fixtures/search_offers_schema.json` é o schema real coletado da sessão
MCP autenticada em 17/10/2026, sem produtos, tokens ou dados pessoais.

Contratos exportados: `../docs/contracts/agent-request.schema.json` e
`agent-response.schema.json`. O OpenAPI está em `/docs`.

## Carrinho

Fluxo determinístico, fora do agente (`app/cart.py`):

1. `GET /api/addresses` → `listAddresses` (o `createCart` exige `addressId`).
2. `POST /api/cart/proposal` `{merchant_id, address_id, linhas:[{item_id, quantidade}]}`:
   aceita apenas produtos observados pelo MCP numa busca recente (30 min), de uma
   única loja; nome e preço vêm do snapshot do backend. Devolve `snapshot_hash`
   e expira em 10 min.
3. `POST /api/cart/confirm` `{proposal_id, snapshot_hash, confirm:true}` →
   `createCart` (sem retry automático) → `getCart`. Repetir a confirmação devolve
   o mesmo carrinho. Os totais exibidos são os do `getCart`.

Todas as chamadas usam o `inputSchema` anunciado por `tools/list`, incluindo
suas páginas adicionais. `createCart` recebe `options: []` em cada item.
O parser lê os campos documentados de `summary` (`subtotalAmount`,
`deliveryFeeAmount`, `totalAmount`) e o aviso `warning`. Valores ausentes
continuam desconhecidos. Exige os escopos de endereço e carrinho em `IFOOD_SCOPES`.

## Limites do MVP

OAuth e perfis ainda são de um protótipo local de **um usuário**: tokens globais
em memória e session_id opaco, sem isolamento multiusuário por cookie. Não expor
publicamente como está. A única escrita no MCP é `createCart`, feita pelo backend
(nunca pelo agente) após confirmação explícita; não há entrega, pagamento,
`submitOrder`, perfil no servidor iFood ou persistência em disco de conversas. Tracing
do SDK está desativado nesta versão para não exportar contexto sensível.

Os filtros alimentares são classificação de catálogo; não comprovam ingredientes,
ausência de contaminação cruzada nem adequação clínica. Erros/catálogo vazio são
tratados explicitamente. Não são feitas compras.

Resultados da verificação real e pendências: [IMPLEMENTACAO-AGENTE.md](../docs/IMPLEMENTACAO-AGENTE.md).


## Entrada por fotografia

`POST /api/context/parse-image` aceita JSON com `image_data_url` (data URL base64
JPEG, PNG ou WebP) e `message` opcional (até 4000 caracteres). O limite é 5 MiB
para o arquivo; o corpo JSON também é limitado antes de ser interpretado.
O schema está em `docs/contracts/image-request.schema.json` e no OpenAPI.

A validação Pillow limita imagens a 20 MP e rejeita animações/arquivos inválidos,
corrige a orientação EXIF, remove metadados e reduz o lado a 2048 px. Todo o
processamento ocorre em memória; não utiliza UploadFile/arquivos temporários.
O modelo configurado em OPENAI_MODEL deve aceitar visão (padrão gpt-4.1-mini).
O Agents SDK envia `input_image`, com armazenamento/tracing desabilitados e sem
ferramentas comerciais. O resultado é AgentResponse, sem sessão ou chamada MCP.
Ingredientes são INFERRED/confirmado=false e quantidade/unidade ficam null.
Sem texto complementar, o contexto reconhecido também fica vazio.

Erros: 413 tamanho/resolução, 415 formato/animação, 422 dados inválidos, 503 chave
não configurada, 504 timeout, 502 falha de análise. Erros nunca devolvem base64.
Uma imagem ilegível/sem alimentos pode produzir uma lista vazia para correção ou
nova captura. Uma análise bem-sucedida não comprova validade ou segurança.

Referência: [OpenAI — imagens e visão](https://developers.openai.com/api/docs/guides/images-vision).

## Revisão de integração e limpeza

A revisão de 18/10 removeu `search_groceries_text`, o campo ignorado
`AgentRequest.query`, a seleção de argumentos alternativos que não era usada e
as conexões duplicadas do adaptador. No frontend, foram removidos o componente
`Limitations` e o cliente `api.tools`, que ficaram sem consumidores após a
remoção dos painéis. A rota de diagnóstico `GET /api/integration/tools` continua
disponível para inspecionar as capacidades reais da conta conectada.

`buscas` continua necessário para a interface distinguir erro, catálogo vazio e
resultados não selecionados. `limitacoes` permanece como informação da resposta
da API e do contexto do agente; sua remoção visual não elimina as regras de
validação, as restrições alimentares ou os estados de confirmação do carrinho.

Os comentários explicam decisões locais, como evitar uma segunda criação após
falha de leitura e descartar endereços de uma conexão anterior. Detalhes da
verificação e referências oficiais: [Integração MCP](../docs/wiki/03-backend/integracao-mcp.md).
