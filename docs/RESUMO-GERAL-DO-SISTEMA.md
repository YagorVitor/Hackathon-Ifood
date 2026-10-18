# RESUMO GERAL DO SISTEMA

## CompletAI — diagnóstico técnico e plano do MVP

**Inspeção técnica realizada em 17/10/2026, por volta de 17h \(Brasília\)\. Esta revisão organiza o planejamento; não representa uma nova auditoria do código\. Referência de produto: docs/HACKATHON\_CONTEXT\.md\.** Preservar a proposta validada pelos mentores: compreender o contexto e os ingredientes existentes, planejar uma refeição e comprar somente o que faltar\. Mercado é a vertical do MVP; Farmácia, Petshop, voz e dispositivos ficam no roadmap\.

## Decisões para execução

- **Produto fechado:** CompletAI para o consumidor, com Mercado como vertical do MVP\. A ideia B2B permanece registrada apenas como brainstorming não selecionado\.
- **P0:** texto → ingredientes confirmados → refeição/faltantes → consulta real ao MCP → recomendação comercial utilizável\. A estratégia sem compra também deve funcionar\.
- **Próximo marco:** OAuth do consumidor, tools/list e consulta GROCERIES\. Ferramenta documentada e cadastro aprovado ainda não comprovam integração funcionando\.
- **Condicional:** fotografia após o fluxo textual; checkout próprio após validação de entrega/pagamento\. Voz e dispositivos são P2; histórico é complementar e depende do acesso efetivamente disponível\.
- **Gestão:** responsáveis nominais e disponibilidade da equipe ainda precisam ser definidos\. Os estados do Kanban foram preservados; um título revisado não comprova implementação concluída\. O cronograma é uma proposta, sujeita à confirmação do prazo da organização\.

## 1\. Estado verificado

- Clone: /home/inovia/Downloads/Hackathon\-Ifood\. GitHub: YagorVitor/Hackathon\-Ifood, main, commit 79a76b4\. Árvore contém somente \.gitignore, README\.md e docs/HACKATHON\_CONTEXT\.md\. Não há aplicação, dependências, testes, pipeline ou integração implementada\.
- A pasta de trabalho do chat é outro diretório, com Git sem commits\. A implementação futura deve usar o clone correto\.
- Portal: agente CompletAI aprovado, com escopos de usuário, descoberta, carrinho, pagamento/checkout e pedidos\. Callback cadastrado: http://localhost:8000/auth/callback\.
- Client ID cadastrado; o portal exibia a opção de gerar Client Secret\. A posse de um segredo válido e a troca por tokens ainda precisam ser confirmadas\. Na inspeção, não havia usuário de teste cadastrado\. Termos e privacidade apontam para http://google\.com e precisam de conteúdo próprio antes da entrega\.
- Teste sem token: initialize no gateway oficial respondeu HTTP 401 / invalid\_token\. Metadados OAuth confirmam authorization server https://id\.ifood\.com\.br\. HEAD respondeu 404; isso isoladamente não indica falha do transporte MCP\.
- Ainda NÃO validado: OAuth de consumidor, initialize autenticado, tools/list real, chamada de catálogo GROCERIES, preços/disponibilidade na região e carrinho de Mercado\. Login no portal não equivale a autenticação do consumidor\.

## 2\. Capacidades documentadas do MCP oficial

Gateway indicado no guia de instalação: https://consumer\-mcp\.ifood\.com\.br/marketplace\. Um único gateway agrega quatro domínios\. As ferramentas abaixo foram verificadas na documentação; a exposição e os schemas em runtime devem ser conferidos com tools/list\.

- **User:** getUser, listAddresses, createAddress\. getUser pode trazer texto de comportamento conforme escopo; isso não é um cadastro estruturado de preferências, alergias ou saúde\. Nosso perfil declarado continua próprio\.
- **Offer Discovery:** searchOffers, browseOffers, getRecommendations, listItemTaxonomy, getMerchant, getItem\. merchantType inclui GROCERIES, DRUGSTORE e PETSTORE\. Para produtos, definir resultKind=ITEM; o padrão é MERCHANT\. Busca exige userLocation; começar por listAddresses\.
- **Cart:** createCart, getCart, getCartDeliveryMethods, addItemToCart, updateCartItem, removeItemFromCart, removeVoucher, listVouchers, setVoucher, setCartDelivery, setCartPayment, listPaymentMethods, submitOrder\. createCart exige estabelecimento, endereço e ao menos um item; options é obrigatório, mesmo vazio\. submitOrder exige entrega, pagamento e consentimento explícito\.
- **Order Tracking:** trackOrder e getOrder\. Monitoramento por polling, respeitando orientação e parada do servidor\. Não há ferramenta de listagem geral de pedidos nesse domínio\.
- Descoberta oferece preços em BRL, preços promocionais, taxas e deeplinks\. Filtros dietary documentados: VEGETARIAN, VEGAN, GLUTEN\_FREE\. Esses filtros não garantem segurança para alergias\.

## 3\. Divergências documentais e pontos de validação

Os pontos abaixo foram observados nos textos oficiais\. Ainda não são falhas reproduzidas do servidor MCP\.

- Erros não têm um envelope único: User/Discovery usam errors; Cart usa error; Tracking usa campos na raiz\. HTTP de sucesso pode carregar erro de negócio\. O adapter deve normalizar transporte, JSON\-RPC, isError e payload do domínio\.
- Cart declara cardTokenId necessário para cartão e orienta copiá\-lo de listPaymentMethods; a referência compartilhada diz que esse campo é sempre null nessa listagem\. Validar com a equipe iFood antes de prometer pagamento por cartão\.
- Entrega agendada solicita selectedTimeSlotId, mas o exemplo de timeslots mostra somente from/to\. Validar schema real; não inventar IDs\.
- O exemplo da visão geral usa um endpoint de catálogo diferente do guia de instalação\. Priorizar o gateway do guia, que respondeu ao handshake, e os schemas reais\.
- A conta de teste ONLY\_TEST\_AGENT é de sandbox, não realiza pedidos reais\. A documentação alerta para não concluir pagamentos reais de teste\. A demo deve indicar claramente sandbox, dados retornados pelo MCP e qualquer simulação local\.

## 4\. Arquitetura mínima recomendada

**Monólito modular: React \+ Vite \+ TypeScript \+ Tailwind → FastAPI \+ Pydantic → adapter MCP oficial\.** Um agente principal; regras comerciais e autorização controladas pelo backend\. OpenAI Agents SDK é a preferência, condicionada ao teste de compatibilidade com o transporte/autenticação do evento\.

- **frontend/:** formulário de contexto, chips editáveis de ingredientes, preferências opcionais, cards de receitas/produtos, estado da integração e revisão da ação comercial\.
- **backend/app/api/:** rotas da aplicação, validação de entrada, sessão e callback OAuth\. Estes são contratos internos, não endpoints do iFood\.
- **domain/:** InventoryItem, UserContext, UserProfile, PurchaseNeed, ProductCandidate, Recommendation\. Quantidade pode ser desconhecida; manter origem e confirmação\.
- **application/:** captura → confirmação → planejamento → escolha → consulta comercial → revisão → ação autorizada\. Estado explícito evita compra fora da etapa correta\.
- **agent/:** interpretação, plano estruturado e explicação\. Recebe apenas ferramentas permitidas; não controla tokens, preços finais ou consentimento\.
- **rules/:** unidades, faltantes, orçamento, valores com Decimal/centavos, vínculo item–loja, opções obrigatórias, restrições declaradas e autorização\. Quantidades de receita não equivalem automaticamente a embalagens compráveis\.
- **integrations/ifood/:** conexão MCP, schemas reais, mapeamento de IDs, normalização de respostas/erros, limites e timeouts\. Não implementar chamadas REST copiando exemplos se o requisito é demonstrar o MCP\.
- **verticals/market/:** regras de refeição e aproveitamento\. Extensão futura por políticas específicas para pet e farmácia; sem implementar essas jornadas agora\.
- **infrastructure/:** sessão em memória com expiração para P0; SQLite somente se necessário para P1\. Credenciais/tokens apenas no backend; logs com ferramenta, duração, resultado e correlação, sem tokens, endereço completo ou dados de saúde\.

## 5\. Fluxo comercial do MVP

1. Texto → contexto estruturado → usuário confirma ingredientes, quantidades conhecidas, tempo, pessoas, orçamento e perfil opcional\.
2. Agente apresenta aproveitamento sem compra e complementação; conveniência somente quando houver produtos adequados\.
3. Para compra: OAuth de consumidor → listAddresses → endereço escolhido → searchOffers com merchantType=GROCERIES, resultKind=ITEM, userLocation e refinements apropriados\.
4. Obter getMerchant/getItem com IDs retornados\. Buscar faltantes preferencialmente na mesma loja, para uma sugestão de carrinho coerente\. Mostrar subtotal conhecido, frete/mínimo quando disponíveis e limitações\.
5. Usuário autoriza criar o carrinho → createCart → getCart → revisão dos totais do servidor\. Abrir appDeeplink somente se retornado e validado no teste\.
6. Checkout no aplicativo próprio só entra se houver tempo e teste de ponta a ponta: métodos reais de entrega/pagamento, revisão atual e nova confirmação explícita antes de submitOrder\. Nunca repetir automaticamente uma escrita com resultado incerto\.

## 6\. Ordem de execução até 18/10

Horários de Brasília; planejamento assume duas pessoas programando em frentes coordenadas\. Submissão por volta de 12h30 consta no contexto, mas depende de confirmação com a organização\.

- **P0 — 17/10, 17h–18h: remover risco MCP\.** Responsável integração: preparar credencial no backend, usuário sandbox e OAuth no callback cadastrado; initialize autenticado \+ tools/list \+ uma busca GROCERIES\. Critério: obter produto/loja reais da resposta do ambiente, com IDs, origem e preço quando presente\. Se bloquear, procurar mentores imediatamente; não substituir por catálogo fictício\.
- **P0 — 18h–20h: base e contratos\.** Backend cria domínio, sessão, normalização e confirmação; frontend monta o fluxo visual sobre os mesmos contratos\. Perfil declarado editável e opcional\.
- **P0 — 20h–22h: fechar a jornada por texto\.** Planejamento → faltantes → MCP → produtos → orçamento → ação comercial disponível\. Critério: cenário completo utilizável, sem produto/preço inventado e sem compras automáticas\.
- **P0 — 22h–23h: estabilização\.** Sem compra necessária, catálogo vazio, token expirado, ferramenta indisponível, mínimo de pedido e orçamento insuficiente\. Revisar tipos de erro e prevenir duplicidade de carrinho\.
- **Condicional — 23h–00h: fotografia\.** Só iniciar com jornada textual estável; imagem gera hipóteses editáveis, sem presumir quantidade, validade ou segurança\. Se faltar tempo, preservar o fluxo por texto\.
- **P0 — 18/10, 08h–10h: verificação final\.** Rodar frontend → backend → modelo → MCP com conta sandbox; validar também refresh/relogin e orçamento\. Persistência de perfil e comparação de alternativas são P1\.
- **Entrega obrigatória — 10h–11h30:** documento técnico, diagrama/fluxo, justificativas UX, feedback MCP e pitch de 5 minutos\. Preparar cenário principal e gravação de uma execução real, identificada como gravação/sandbox\.
- **11h30:** congelar funcionalidades; revisar links, credenciais, evidências e submissão antes do prazo confirmado\.

## 7\. Critérios de aceite e riscos

- Entrada do exemplo do contexto funciona e permite corrigir ingredientes; itens já disponíveis não reaparecem injustificadamente na compra\.
- Nome, preço, loja e identificadores exibidos vêm de respostas do MCP; cada card distingue declarado, inferido, consultado e estimado\.
- O backend calcula totais e impede comparar subtotal com orçamento como se fosse total entregue\. Respeita embalagem, quantidade, taxas e mínimo da loja\.
- Nenhuma compra ocorre sem confirmação; mudança de preço/carrinho invalida a aprovação anterior\. Erro ou timeout não vira confirmação de sucesso\.
- Alergênicos desconhecidos permanecem desconhecidos\. Preferências declaradas não viram garantias médicas nem são inferidas de histórico\.
- Principais riscos: autenticação ainda não integrada na inspeção; possibilidade de catálogo local vazio; carrinho GROCERIES não testado; diferenças entre documentação e schema; escopo excessivo para o prazo\. Mitigação: integração primeiro, uma loja por proposta, texto antes de imagem e P2 fora do MVP\.

## 8\. Feedback MCP e roadmap

**Proposta de evolução, não funcionalidade atual:** perfil contextual estruturado com preferências declaradas, restrições opcionais separadas, origem, versão, consentimento por finalidade, escopos, atualização e remoção\. Não inferir alergias a partir de userBehaviorDescription\. Registrar também as divergências documentais acima e somente falhas reproduzidas durante a integração\.

**Fontes:** docs/HACKATHON\_CONTEXT\.md; portal autenticado do agente; guias oficiais do iFood: first\-steps/install\-mcp, first\-steps/agent, first\-steps/test\-account, authentication/implementacao, authentication/escopos, mcps/account/tools, mcps/discovery/tools, mcps/cart/tools, mcps/order/tools em https://mcp\-developer\.ifood\.com\.br/pt\-BR/docs/guides/\.

**Nenhum arquivo do repositório foi alterado nesta análise\.**

