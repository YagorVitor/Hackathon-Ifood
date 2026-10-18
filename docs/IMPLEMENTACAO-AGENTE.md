# Estado do backend e do agente

Base do backend: `feature/backend`, integrada em `develop`. Referência de produto: `HACKATHON_CONTEXT.md`.

O planejamento da branch foi usado como base e ajustado para um recorte
executável: backend FastAPI e agente OpenAI Agents SDK como biblioteca stateless
no mesmo processo. O contexto, o histórico e os cálculos pertencem ao backend.
Não é necessário um segundo servidor de agente para esta entrega.

## Implementado

- OAuth PKCE do consumidor com refresh, somente no backend; MCP Streamable HTTP.
- API `/api/agent/message`, compatível com `/agent/test`.
- Contexto Pydantic: inventário confirmado, preferências, restrições sensíveis
  opcionais com consentimento, objetivo, pessoas, tempo, orçamento e localização.
- Sessão opt-in em memória, expiração, histórico limitado e exclusão explícita.
- `AgentEnvelope`/`AgentOutput` versionados e JSON Schemas exportados.
- Agente contextual, até três buscas distintas, cache e somente leitura.
- Filtros reais de `searchOffers`: `itemRestrictions`, `maxItemPrice`,
  `maxDeliveryFee`, `sort`; vertical GROCERIES e resultKind ITEM.
- Identificadores, nomes e preços comerciais preenchidos de evidências da busca
  atual; seleções desconhecidas são removidas.
- Custos conhecidos por opção em centavos, separação de frete e produto,
  quantidades inferidas identificadas e total final sempre não confirmado.
- Erro de busca distinguido de lista vazia, retry de transporte limitado a um,
  sem retries de negócio/schema e sem operações de escrita.

## Verificação realizada em 17/10/2026

1. **20 testes automatizados** passando: contratos, consentimento/revogação,
   sessões, orçamento, proveniência comercial, schema MCP, ferramentas e API.
   Os testes substituem modelo e transporte e usam produtos sintéticos.
2. **OpenAI real:** cenário fictício com arroz, ovos, tomate e preferência
   vegetariana; saída estruturada USE_WHAT_I_HAVE sem compra e sem acionar MCP.
3. **MCP real autenticado:** tools/list retornou searchOffers, listVouchers e
   setVoucher. Só searchOffers está exposta ao agente. O schema de entrada dessa
   ferramenta foi salvo como fixture sem dados pessoais.
4. **Fluxo HTTP → agente OpenAI → MCP real:** busca tomate com filtro VEGAN,
   preço máximo R$ 20 e coordenadas **fictícias (0,0)**. Resposta HTTP 200,
   mcpToolCalled=true, buscas.status=empty, nenhum produto inventado. Isso valida
   transporte/contrato e o caminho vazio; não comprova catálogo na região do
   usuário nem uma recomendação com produtos reais selecionados.
5. Uma primeira tentativa de busca sofreu falha de consulta. O modelo a descreveu
   como resultado vazio. Isso motivou a mensagem determinística de falha e seu
   teste de regressão; a repetição completa retornou estado empty corretamente.

## Diferença confirmada entre documentação e runtime

O guia de Offer Discovery descreve `refinements.dietary`; o schema efetivamente
anunciado nesta sessão usa **`refinements.itemRestrictions`** e enumera
VEGETARIAN, VEGAN, LAC_FREE, GLUTEN_FREE, SUGAR_FREE e ORGANIC. O adaptador usa o
schema anunciado e valida o payload antes de tools/call. Isso é um feedback
concreto de documentação, sem presumir defeito da busca no servidor.

Fonte: https://mcp-developer.ifood.com.br/pt-BR/docs/guides/mcps/discovery/tools

## Pendências e limites

- Validar cenário de complementação com localização escolhida pelo usuário e
  produtos disponíveis. As coordenadas fictícias não servem para demonstrar a
  disponibilidade comercial local.
- Tokens OAuth globais e session_id opaco são simplificações locais de um usuário;
  isolamento multiusuário e cookies de sessão continuam no roadmap.
- Não há carrinho, checkout ou persistência de perfil em disco.
- getItem/getMerchant não foram anunciadas na sessão verificada; não são chamadas.
  A resposta informa preço observado, não revalidação de detalhe nem preço final.
- Filtros não garantem composição, segurança para alergias ou adequação clínica.
  DIABETES não se transforma automaticamente em SUGAR_FREE; alergia a leite não
  se transforma em LAC_FREE.
- Versão executável e exemplos: [backend/README.md](../backend/README.md).


## Revisão de experiência em develop

A captura também retorna `contexto_reconhecido`: objetivo, pessoas, tempo e orçamento
explicitamente mencionados no texto, marcados como inferidos e não confirmados.
O backend não aplica esses valores aos filtros nem ao cálculo: o frontend os exibe
para revisão e só os reenvia como contexto após a confirmação da pessoa.
A captura deve extrair ingredientes mesmo se ainda não houver preferências.

O frontend reúne confirmação e perfil opcional, e inicia a consulta de faltantes
após escolher uma opção e disponibilizar conta/localização. O agente recebe a opção
escolhida completa para preservar a refeição durante a busca. As mesmas restrições
comerciais de somente leitura continuam em vigor.


## Captura por câmera e upload

Implementada em `app/vision.py` e `/api/context/parse-image`, conforme contexto mestre
§4 e §10 e limite de 5 MB do plano do backend. Texto continua disponível sozinho.
Câmera/upload convergem para a mesma representação estruturada e confirmação.
O reconhecimento multimodal é uma etapa de extração sem MCP, histórico ou compras;
o agente de planejamento recebe depois apenas o inventário confirmado.
Fotos, base64 e metadados não entram em sessão, logs de acesso ou arquivos do app.
Quantidades/unidades reconhecidas na imagem são descartadas; não há inferência
sobre validade, segurança ou perfil de saúde. Objetivo/pessoas/tempo/orçamento vêm
somente do texto complementar e continuam sujeitos à revisão.


Validação da captura em 17/10/2026: build TypeScript/Vite e 28 testes automatizados
passaram. No navegador, o campo nativo selecionou um JPEG e exibiu a prévia;
o fluxo upload → API → OpenAI → revisão funcionou com uma captura da própria
interface como imagem de teste, sem dados pessoais. Uma imagem sem alimentos
retornou lista vazia. Esses testes validam a integração, não a precisão em fotos
reais de despensa. Câmera física/permissão ainda precisa de teste no dispositivo;
não foi autorizada captura de uma câmera pessoal durante a validação.
