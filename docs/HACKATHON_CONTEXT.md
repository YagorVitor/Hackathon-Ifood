CompletAI — Contexto Mestre do Projeto

Hackathon iFood | SEMCOMP XXIX | 17–18/10/2026

1. Contexto do hackathon

Estamos participando do Hackathon Vendendo com Agentes, realizado pela SEMCOMP em parceria com o iFood.

O desafio consiste em criar soluções inovadoras utilizando agentes de inteligência artificial conectados ao MCP oficial do iFood, permitindo novas experiências de descoberta, recomendação e compra de produtos.

O iFood desenvolveu esse protocolo para permitir que aplicações externas integrem capacidades comerciais da plataforma por meio de agentes inteligentes.

O hackathon também tem como finalidade validar o MCP, identificar suas limitações e obter sugestões de evolução.

Critérios oficiais de avaliação

1. Visão e originalidade: criatividade, inovação e diferencial do produto.
2. Arquitetura e engenharia: qualidade do código, decisões técnicas e uso correto do MCP oficial.
3. Experiência do usuário: fluidez, clareza e qualidade das interações com agentes.
4. Impacto: capacidade de resolver problemas reais.
5. Comunicação e pitch: clareza e qualidade da demonstração.

Os pesos dos critérios não foram divulgados.

Entregáveis obrigatórios

- Proposta de negócio, problema e proposta de valor.
- Desenho da solução e fluxo geral.
- Justificativa das decisões de UX.
- Interface visual ou protótipo funcional.
- Documento técnico resumido, incluindo arquitetura e integração com MCP.
- Feedback técnico sobre o MCP, suas limitações e oportunidades de melhoria.

Prazo de submissão informado: domingo, 18/10, aproximadamente às 12h30, sujeito à confirmação com a organização.

Apresentação: 5 minutos de pitch e 3 minutos de perguntas.

---

2. Nossa solução: CompletAI

Estado da proposta

A ideia já foi apresentada aos mentores do iFood e recebeu feedback positivo.

A equipe decidiu seguir com essa proposta. Não devemos substituir o produto, apenas refiná-lo e implementar suas funcionalidades.

Conceito central

A CompletAI é um agente inteligente de conveniência que compreende o contexto do usuário para identificar o que ele já possui, descobrir suas necessidades e transformar essas informações em decisões de compra personalizadas.

O princípio do produto é:

"Antes de descobrir o que você quer comprar, entendemos o que você realmente precisa."

A solução começa pela alimentação e pela vertical iFood Mercado, mas sua arquitetura deve permitir expansão para Farmácia e Petshop.

Problemas que buscamos resolver

- Consumidores não sabem o que preparar com os alimentos disponíveis.
- Alimentos são desperdiçados por falta de planejamento.
- Compras são realizadas sem considerar o que já existe em casa.
- Pessoas com preferências ou restrições alimentares precisam repetir informações constantemente.
- Aplicativos de comércio normalmente começam pela busca de produtos, sem compreender plenamente o contexto do consumidor.
- O consumidor precisa organizar manualmente uma necessidade antes de transformá-la em compra.

Nossa proposta de valor

Transformar informações desestruturadas sobre a vida do consumidor em necessidades comerciais estruturadas e acionáveis.

O agente deve entender o contexto, analisar alternativas, consultar dados reais pelo MCP e sugerir a melhor ação.

Ele não deve simplesmente tentar vender produtos. Deve recomendar uma compra quando ela realmente fizer sentido.

---

3. Feedback validado pelos mentores do iFood

Esta seção contém informações fornecidas diretamente pelos mentores durante o evento e deve orientar decisões de produto.

3.1. Perfis e tags de usuários

Os mentores informaram que o iFood não possui atualmente um sistema de tags estruturadas de perfil para informações como:

- Vegetariano ou vegano.
- Intolerância à lactose.
- Alergias alimentares.
- Restrições relacionadas ao consumo de açúcar.
- Condições como diabetes.
- Outras necessidades ou preferências individuais.

Eles consideraram interessante a proposta de criar essas informações contextuais e recomendaram que apresentássemos essa possibilidade como sugestão de evolução do MCP.

Portanto:

1. Nosso produto deve possuir um sistema próprio de preferências e restrições declaradas pelo usuário.
2. O agente deve considerar essas informações em suas recomendações.
3. Não devemos presumir que o MCP atual fornece ou armazena essas tags.
4. Devemos documentar uma proposta de extensão do MCP para permitir integração futura desse contexto, mediante consentimento e controles de acesso.

Preferências alimentares devem ser separadas de alergias e dados de saúde, que exigem controles mais rigorosos.

Informações sobre alergias devem ser utilizadas para sinalizar riscos e evitar recomendações não verificadas. A ausência de informações sobre alérgenos não significa que um produto seja seguro.

Para condições como diabetes, o agente não deve oferecer diagnóstico, tratamento ou garantia de adequação clínica.

3.2. O produto não deve depender de imagens

Os mentores recomendaram não limitar a solução a fotografias de geladeiras ou despensas.

Foi mencionado o exemplo de óculos inteligentes da Meta como possibilidade de interação futura.

Isso não significa implementar integração com óculos durante o hackathon.

Significa desenvolver uma arquitetura em que diferentes interfaces possam fornecer contexto ao mesmo núcleo de inteligência.

Entradas consideradas:

- Texto em linguagem natural.
- Fotografia.
- Voz, futuramente.
- Integrações com dispositivos inteligentes, futuramente.
- Histórico de compras, se houver acesso autorizado.
- Informações declaradas pelo usuário.

O processamento deve transformar diferentes modalidades de entrada em representações estruturadas, independentes de sua origem.

O núcleo de decisão e as integrações comerciais não devem depender diretamente do formato da entrada.

3.3. Foco estratégico nas verticais do iFood

Os mentores destacaram três verticais relevantes para a estratégia de conveniência da empresa:

iFood Mercado

- Vertical prioritária para o MVP.
- O iFood foi apresentado pelos mentores como líder desse segmento.
- Nosso principal fluxo comercial deve utilizar produtos dessa vertical.

iFood Farmácia

- Vertical em que a empresa deseja crescer e alcançar liderança.
- Possibilidade de expansão para reposição contextual de produtos de higiene, cuidados pessoais e outros produtos permitidos.

iFood Petshop

- Outra vertical apontada como estratégica para crescimento.
- Possibilidade de trabalhar com perfis de animais e reposição inteligente de produtos.

O MVP NÃO precisa implementar integralmente as três verticais.

A arquitetura deve permitir sua inclusão futura, evitando dependências desnecessárias com uma única categoria de produtos.

---

4. Fluxo principal — iFood Mercado

Este é o fluxo prioritário para implementação.

Etapa 1 — Captura de contexto

O usuário informa o que possui em casa por texto ou fotografia.

Exemplo:

"Tenho arroz, ovos, tomate e cenoura. Quero preparar um jantar para duas pessoas, tenho 30 minutos e posso gastar até R$ 35."

O sistema pode extrair:

- Ingredientes disponíveis.
- Quantidades conhecidas ou estimadas.
- Objetivo do usuário.
- Número de pessoas.
- Orçamento.
- Tempo disponível.
- Preferências e restrições.

Caso uma fotografia seja utilizada, o modelo multimodal deve extrair possíveis ingredientes.

O resultado precisa ser validado ou corrigido pelo usuário.

Não presumir quantidades, validade ou segurança dos ingredientes com base apenas na imagem.

Etapa 2 — Perfil contextual

O sistema complementa as informações da solicitação com as preferências e restrições cadastradas pelo usuário, mediante autorização apropriada.

Exemplos:

- Vegetariano.
- Não gosta de determinado ingrediente.
- Prefere refeições rápidas.
- Possui orçamento limitado.
- Declarou alergia a determinado alimento.

O perfil deve ser editável, e informações sensíveis devem ser opcionais e protegidas.

Etapa 3 — Planejamento

O agente considera os ingredientes existentes, preferências, orçamento e tempo disponível.

Ele deve identificar possibilidades de refeições, ingredientes faltantes e alternativas.

Etapa 4 — Estratégias de decisão

O sistema considera três caminhos:

A. Aproveitamento integral

Recomendar refeições que possam ser preparadas com os ingredientes existentes, sem exigir compra.

B. Complementação pelo Mercado

Identificar ingredientes faltantes, consultar produtos reais pelo MCP e construir uma sugestão de compra.

Este é o caminho central da demonstração comercial.

C. Conveniência

Quando apropriado, sugerir produtos prontos ou de preparo rápido, desde que existam opções adequadas disponíveis no catálogo acessível pelo MCP.

Etapa 5 — Consulta ao MCP

Utilizar as ferramentas oficiais disponíveis para obter informações sobre produtos, preços e outras operações efetivamente suportadas.

O sistema não deve inventar produtos, preços, estabelecimentos, disponibilidade ou funcionalidades comerciais.

A documentação e os schemas reais do MCP são a fonte da verdade.

Etapa 6 — Recomendação

O agente apresenta uma ou mais alternativas, incluindo:

- O que preparar.
- Quais ingredientes já serão aproveitados.
- Quais ingredientes precisam ser adquiridos.
- Produtos reais encontrados.
- Custo dos produtos consultados.
- Justificativa da recomendação.
- Possíveis limitações dos dados.

Quando não houver produtos adequados, o sistema deve informar isso com transparência.

Etapa 7 — Compra

O usuário pode optar pela alternativa recomendada.

O sistema deve utilizar somente as operações comerciais realmente oferecidas pelo MCP.

Compras ou alterações comerciais sensíveis exigem confirmação explícita do usuário.

Não presumir suporte a carrinho, checkout, pagamentos ou finalização de pedidos antes de verificar a documentação.

---

5. Expansão futura: múltiplas verticais

Mercado

Cenário:

"Tenho alguns ingredientes em casa e quero preparar o jantar gastando pouco."

O agente planeja a refeição, identifica ingredientes faltantes e procura produtos no iFood Mercado.

Petshop

Cenário:

"A ração do meu gato está acabando. Quero comprar outra embalagem adequada ao perfil dele."

O sistema pode utilizar informações fornecidas pelo tutor, como espécie, faixa etária, preferências alimentares e produtos utilizados anteriormente.

O agente consulta produtos disponíveis e apresenta alternativas.

Não realizar diagnósticos veterinários nem presumir que produtos diferentes sejam clinicamente equivalentes.

Farmácia

Cenário:

"Meu protetor solar e meus produtos de higiene estão acabando. Preciso repor."

O agente pode auxiliar na identificação e busca de produtos de cuidados pessoais.

Informações sobre medicamentos, interações, contraindicações ou substituições exigem controles específicos.

O sistema não deve recomendar tratamentos nem substituições de medicamentos de forma autônoma.

Princípio arquitetural

As verticais devem compartilhar:

- Captura de contexto.
- Perfis e preferências.
- Gerenciamento de sessões.
- Orquestração de agentes.
- Sistema de recomendações.
- Validação de ferramentas.
- Auditoria de operações.

As regras específicas de cada vertical devem ser separadas.

---

6. Arquitetura técnica

Stack preferencial

- Frontend: React + Vite + TypeScript + Tailwind CSS.
- Backend: Python + FastAPI + Pydantic.
- Agentes: OpenAI Agents SDK, se compatível com os requisitos e recursos disponíveis.
- Visão multimodal: modelo com capacidade de interpretação de imagens.
- Integração comercial: MCP oficial do iFood.
- Persistência: a solução mais simples adequada ao MVP.
- Observabilidade: registros estruturados e rastreamento de execuções dos agentes.

Essas são preferências, não exigências imutáveis. Antes de propor mudanças, inspecionar o repositório e preservar implementações funcionais.

Separação de responsabilidades

Camada de entrada

Recebe texto, imagens e futuramente outras modalidades.

Converte as informações em objetos estruturados.

Camada de contexto

Gerencia ingredientes disponíveis, perfil do usuário, orçamento, preferências, restrições e estado da sessão.

Camada agêntica

Interpreta solicitações, planeja alternativas, seleciona ferramentas e explica recomendações.

Camada determinística

Executa validações, comparação de quantidades, cálculos de preços e orçamento, filtros conhecidos e regras de autorização.

Camada de integração comercial

Encapsula o MCP oficial do iFood.

Fornece uma interface consistente para as operações reais disponíveis, sem inventar capacidades ausentes.

Princípio fundamental

A IA interpreta, planeja e explica. O backend valida, calcula e controla. O MCP fornece as capacidades comerciais disponíveis.

Priorizar um agente principal com ferramentas bem definidas.

Não implementar uma arquitetura multiagente complexa sem justificativa concreta.

---

7. Modelo conceitual de domínio

Entidades sugeridas:

UserProfile

- Identificador.
- Preferências declaradas.
- Restrições alimentares opcionais.
- Preferências de compra.
- Configurações de privacidade.

InventoryItem

- Nome normalizado.
- Quantidade conhecida, estimada ou desconhecida.
- Unidade.
- Origem da informação.
- Status de confirmação.

UserContext

- Objetivo.
- Orçamento.
- Tempo disponível.
- Número de pessoas.
- Preferências aplicáveis.
- Itens disponíveis.

PurchaseNeed

- Produto ou ingrediente necessário.
- Quantidade desejada.
- Restrições relevantes.
- Prioridade.

ProductCandidate

- Identificador retornado pelo MCP.
- Nome.
- Preço, quando disponível.
- Disponibilidade, quando informada.
- Fonte.
- Metadados relevantes.

Recommendation

- Estratégia proposta.
- Justificativa.
- Itens utilizados.
- Itens faltantes.
- Produtos selecionados.
- Custo conhecido.
- Limitações e incertezas.

Essas entidades são conceituais. Não é obrigatório criar tabelas para todas elas no MVP.

Priorizar contratos Pydantic e estruturas simples antes de adicionar persistência complexa.

---

8. Proposta de melhoria do MCP

Os mentores solicitaram que a sugestão sobre tags de usuário fosse apresentada posteriormente como feedback.

Devemos documentar uma proposta técnica para perfis contextuais e preferências estruturadas, contemplando:

- Preferências alimentares.
- Restrições declaradas pelo consumidor.
- Preferências de compra.
- Características de pets, quando aplicável.
- Consentimento e controle sobre compartilhamento.
- Atualização e remoção de informações.
- Escopos de acesso adequados.

Não assumir que o MCP atual oferece essas funcionalidades.

Se possível, elaborar:

1. Descrição do problema.
2. Caso de uso.
3. Limitação identificada no protocolo.
4. Possível contrato estruturado.
5. Benefícios para consumidores e aplicações parceiras.
6. Considerações de segurança, privacidade e LGPD.

Dados de saúde e informações sensíveis devem ter tratamento distinto de preferências comuns.

Também registrar problemas reais encontrados durante a integração: autenticação, documentação, descrições de ferramentas, erros, campos ausentes e inconsistências.

Não inventar falhas do MCP para preencher a documentação.

---

9. Escalabilidade e independência de interface

A arquitetura não deve acoplar as regras de negócio ao upload de imagens.

Exemplos de canais futuros:

- Aplicação web.
- Aplicativo mobile.
- Interface conversacional.
- Voz.
- Óculos inteligentes.
- Assistentes conectados.
- Sistemas domésticos inteligentes.

Todos devem conseguir, conceitualmente, fornecer informações para uma camada comum de interpretação contextual.

Não implementar integrações com dispositivos inteligentes durante o hackathon, salvo se o MVP estiver concluído e houver justificativa real.

A escalabilidade arquitetural deve ser demonstrada principalmente pela separação de responsabilidades, e não pela quantidade de integrações implementadas.

---

10. UX e demonstração

A experiência deve ser simples e visual.

Fluxo prioritário:

1. Usuário informa ou fotografa os alimentos.
2. O sistema apresenta os itens reconhecidos.
3. Usuário corrige ou confirma os ingredientes.
4. O sistema considera seu perfil e objetivo.
5. O agente apresenta alternativas.
6. O usuário escolhe uma receita ou estratégia.
7. O sistema consulta o MCP do iFood Mercado.
8. A interface apresenta os produtos faltantes e os valores retornados.
9. O usuário confirma a ação comercial disponível.

A interface deve evidenciar que o agente utiliza dados reais e ferramentas externas.

Diferenciar claramente:

- Informações declaradas pelo usuário.
- Inferências do modelo.
- Dados retornados pelo MCP.
- Estimativas.
- Ações efetivamente executadas.

Evitar uma interface baseada exclusivamente em conversação textual.

Utilizar componentes visuais para ingredientes, receitas, produtos e alternativas comerciais.

---

11. Priorização do MVP

P0 — Essencial

- Inspecionar o repositório atual.
- Conectar e testar o MCP oficial do iFood.
- Identificar as ferramentas reais e suas limitações.
- Confirmar suporte ao catálogo de Mercado.
- Implementar entrada por texto.
- Implementar entrada por imagem, se viável.
- Normalizar e confirmar ingredientes identificados.
- Permitir informar preferências e restrições.
- Sugerir receitas ou estratégias relevantes.
- Identificar ingredientes faltantes.
- Consultar produtos reais do Mercado pelo MCP.
- Apresentar uma recomendação comercial utilizável.
- Construir um fluxo de demonstração funcional.

P1 — Importante

- Persistência de perfis.
- Comparação entre alternativas.
- Justificativas transparentes das recomendações.
- Refinamento da UX.
- Tratamento de cenários de indisponibilidade.
- Documentação técnica e feedback do MCP.
- Preparação de cenários de teste e pitch.

P2 — Expansão

- Entrada por voz.
- Fluxo completo de Petshop.
- Fluxo de Farmácia.
- Histórico avançado.
- Integrações com dispositivos externos.
- Perfis familiares.
- Automação de reposição.

Não começar recursos P2 antes de estabilizar P0.

---

12. Qualidade, segurança e confiabilidade

Regras obrigatórias:

- Não inventar ferramentas ou endpoints do MCP.
- Nunca expor credenciais no frontend ou repositório.
- Utilizar variáveis de ambiente para segredos.
- Não registrar dados sensíveis desnecessariamente.
- Exigir consentimento para coleta de dados pessoais.
- Exigir confirmação explícita para compras.
- Validar preços e quantidades no backend.
- Não confiar cegamente nas respostas do modelo.
- Não presumir composição ou segurança de produtos sem dados verificáveis.
- Não transformar perfis alimentares em aconselhamento médico.
- Tratar erros, timeouts e indisponibilidade das ferramentas.
- Não afirmar que uma ação foi concluída sem confirmação do sistema.
- Utilizar mocks apenas quando necessários, identificando-os claramente.
- Garantir que a demonstração não confunda dados simulados com integrações reais.

---

13. Estratégia para apresentação

A narrativa deve mostrar uma mudança de paradigma:

Comércio tradicional: o consumidor procura um produto.

CompletAI: o agente compreende o contexto do consumidor e identifica se, quando e o que vale comprar.

A demonstração deve comunicar:

1. Problema real.
2. Compreensão contextual e multimodal.
3. Personalização por preferências e restrições.
4. Planejamento inteligente.
5. Integração real com o MCP do iFood Mercado.
6. Arquitetura extensível para Petshop e Farmácia.
7. Oportunidades de evolução do MCP identificadas durante o desenvolvimento.

Não fazer promessas sobre funcionalidades não implementadas.

Separar claramente MVP funcional de roadmap futuro.

---

14. Instruções imediatas para o Codex

Você é o engenheiro de software colaborando com a equipe da CompletAI.

Sua prioridade é ajudar a desenvolver uma solução funcional, original, confiável e tecnicamente defensável dentro do prazo do hackathon.

Antes de começar a implementar:

1. Inspecione o repositório e identifique tecnologias e funcionalidades existentes.
2. Leia a documentação oficial do MCP que estiver disponível.
3. Identifique as operações comerciais reais suportadas.
4. Verifique o estado atual da autenticação e da conexão.
5. Identifique gargalos e riscos críticos.
6. Proponha um plano curto para entregar o MVP.
7. Preserve as decisões já validadas pelos mentores.

Após a análise, apresente:

- Estado atual do sistema.
- Funcionalidades prontas.
- Funcionalidades faltantes.
- Limitações confirmadas do MCP.
- Arquitetura mínima recomendada.
- Próximas tarefas em ordem de prioridade.
- Riscos que podem comprometer a demonstração.

Não reescreva o projeto sem necessidade. Não substitua a ideia escolhida. Não crie funcionalidades fora do escopo prioritário.

Se a implementação for solicitada, entregue código funcional, verificável e incremental, respeitando os contratos e os padrões existentes.

O objetivo não é demonstrar a maior quantidade de tecnologia possível.

O objetivo é demonstrar uma nova experiência de comércio contextual, viabilizada por agentes e pelo MCP oficial do iFood.