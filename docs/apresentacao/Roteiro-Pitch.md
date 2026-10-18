# Roteiro de pitch — CompletAI

**Duração-alvo:** 5 minutos. **Formato da banca:** 5 minutos de apresentação + 3 minutos de perguntas.  
**Deck:** `Despensa-Reversa-Pitch-Banca.pptx`  
**Fonte de produto:** `docs/HACKATHON_CONTEXT.md`. Este roteiro preserva a ideia validada pelos mentores.

## 0:00–0:25 — Abertura

“Quando abrimos um app de mercado, normalmente começamos procurando produtos. Mas muitas vezes a dúvida vem antes: o que dá para preparar com o que já existe em casa? A CompletAI começa pela despensa. Ela entende o contexto, ajuda a escolher uma refeição e só consulta o iFood Mercado para complementar o que falta.”

## 0:25–1:05 — Problema e proposta de valor

“Hoje as pessoas precisam organizar manualmente ingredientes, tempo, orçamento e preferências antes de transformar isso numa compra. Isso pode levar a compras repetidas e desperdício. Nossa proposta é converter um relato cotidiano em uma decisão útil: aproveitar tudo o que já existe, comprar apenas o necessário ou escolher conveniência quando fizer sentido. O MVP começa em Mercado; Farmácia e Pet são caminhos de expansão, não escopo desta entrega.”

## 1:05–1:55 — Experiência e protótipo

“O fluxo é curto. A pessoa descreve a despensa por texto ou envia uma foto. O sistema transforma a entrada em ingredientes e contexto reconhecido, que a pessoa pode corrigir e confirmar. Depois recebe sugestões; pode seguir sem compra ou escolher uma opção e consultar os faltantes no Mercado. Preferências são opcionais. A imagem produz hipóteses: não presumimos quantidade, validade, segurança do alimento ou condição de saúde. A confirmação fica no ponto em que evita erro, sem transformar a conversa num formulário longo.”

**Demonstração sugerida, se houver tempo dentro deste bloco:**

1. Abrir o protótipo já na tela de captura.
2. Inserir o exemplo autorizado: arroz, ovos, tomate e cenoura; jantar para duas pessoas em 30 minutos.
3. Mostrar a revisão dos ingredientes e do contexto antes de confirmar.
4. Mostrar uma opção de refeição e a separação entre itens disponíveis e faltantes.
5. Se demonstrar MCP, usar localização/endereço autorizado pelo usuário. Se a busca retornar vazia, dizer: “A consulta foi feita ao MCP e este foi o resultado do catálogo para esta região e momento.” Não usar coordenadas fictícias como prova de disponibilidade nem apresentar produtos inventados.

## 1:55–2:55 — Arquitetura e integração

“A interface é React, Vite e TypeScript. O backend FastAPI valida os contratos, mantém OAuth e contexto, e chama o agente OpenAI para interpretar e explicar. A integração comercial usa o MCP oficial do iFood. Nesta sessão real de `tools/list`, recebemos `searchOffers`, `listVouchers` e `setVoucher`; o agente recebe somente `searchOffers`, em modo de busca. O adapter valida os argumentos com o schema anunciado pelo servidor. A extração de imagem é uma etapa separada, sem ferramenta MCP. Temos 28 testes automatizados aprovados e o build do frontend passou.”

## 2:55–3:40 — UX, impacto e segurança

“Escolhemos revisão explícita para manter a pessoa no controle, e não exigir perfil antes de mostrar valor. O agente diferencia informação declarada, hipótese e dado comercial consultado. Preferências e restrições podem ser informadas pelo usuário; informações sensíveis são opcionais e pedem consentimento. A ausência de dados de alérgenos não é uma garantia de segurança, e uma condição como diabetes não vira uma recomendação clínica. O impacto que buscamos é reduzir compras desnecessárias e facilitar o aproveitamento do que já está em casa.”

## 3:40–4:25 — Feedback ao MCP e próximas entregas

“A principal oportunidade que encontramos é permitir contexto de perfil estruturado, com origem, consentimento e controles de atualização e remoção. O runtime que consultamos expôs três ferramentas; só a busca de ofertas está conectada ao agente. A busca ponta a ponta verificada usou coordenadas fictícias e voltou vazia, então ela valida transporte e contrato, mas não disponibilidade comercial local. No board, registramos os próximos itens: completar persistência do perfil iFood, ampliar tags alimentares, sugerir porções e acompanhamentos, criar uma base curada de receitas, adicionar conversa por áudio e históricos de recomendações e compras. Histórico de compras depende de acesso oficial que não foi confirmado.”

## 4:25–5:00 — Fechamento

“A CompletAI muda o ponto de partida da compra. Primeiro entende o que a pessoa já tem; depois recomenda a ação mais útil, inclusive não comprar. Hoje temos fluxo de interface e agente, OAuth no backend, entrada por texto e foto, confirmação humana e consulta ao MCP para ofertas. O próximo marco é validar a busca com uma região autorizada e demonstrar o resultado real. Obrigado.”

## Perguntas prováveis da banca

**O produto compra automaticamente?**  
Não. O fluxo atual consulta ofertas em modo somente leitura. Não há criação de carrinho, checkout ou pedido implementados no agente.

**O MCP salva as restrições alimentares?**  
Não. O perfil declarado é responsabilidade da aplicação. No runtime verificado não encontramos tags estruturadas de perfil; os filtros de busca disponíveis não substituem confirmação de alergênicos nem avaliação clínica.

**A visão computacional reconhece qualquer alimento?**  
A integração de extração foi validada com imagens de teste, mas não medimos precisão em fotografias reais de despensas. O resultado é sempre editável e não inclui quantidade, validade ou segurança.

**A busca mostrou produtos reais disponíveis perto do usuário?**  
Ainda não na validação registrada: usamos coordenadas fictícias e obtivemos uma resposta vazia. Isso confirmou a chamada, não a oferta local. Para a banca, devemos usar uma localização autorizada e apresentar exatamente o que o MCP retornar.

**Por que usar um agente OpenAI se a integração pedida é MCP?**  
O agente interpreta a intenção e organiza a recomendação; o MCP oficial é a fonte das ofertas comerciais. O agente não substitui nem simula o MCP.

**Como vocês evitam vender mais do que a pessoa precisa?**  
O plano considera primeiro o inventário informado. A busca só ocorre quando a pessoa escolhe uma opção que requer itens faltantes; também existe o caminho sem compra.

## Checklist de 10 minutos antes do pitch

- Confirmar que backend e frontend estão acessíveis e que a autorização iFood está ativa.
- Usar somente um endereço/localização que o usuário autorizou para a demonstração.
- Conferir que a busca mostra dados retornados agora pelo MCP; se vier vazia, explicar isso com clareza.
- Ter o fluxo por texto pronto como alternativa se a câmera, rede ou OAuth falhar.
- Não mostrar tokens, segredos, endereços completos nem dados sensíveis na tela compartilhada.
- Manter esta apresentação em 5 minutos e reservar os 3 minutos seguintes para perguntas.
