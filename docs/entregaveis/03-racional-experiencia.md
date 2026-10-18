# 03 — Racional da Experiência

As decisões de UX por trás da interação com o agente e o motivo de cada uma.

## 1. Etapas visuais, não um chat

**Decisão:** o fluxo é uma sequência de telas (Sua despensa → Revisão → Sugestões
→ Só o que falta), com cards para ingredientes, receitas e produtos. Não há uma
caixa de conversa livre como interface principal.

**Por quê:** um chat obriga a pessoa a ler parágrafos para achar preço, loja e o
que falta, e esconde o que o agente fez. Cards deixam comparação e correção
visíveis. Isso também segue a orientação de evitar uma interface baseada só em
conversa textual e de mostrar que o agente usa dados reais e ferramentas externas.

## 2. Começar pelo que a pessoa tem, não pelo que ela quer comprar

**Decisão:** a primeira tela pergunta o que há em casa e qual o objetivo, com um
exemplo pronto ("Tenho arroz, ovos, tomate e cenoura…").

**Por quê:** é o centro da proposta (comércio reverso). O exemplo reduz a
ansiedade da página em branco e mostra que dá para escrever do jeito que se fala,
incluindo pessoas, tempo e orçamento, sem preencher formulário.

## 3. Texto primeiro, foto como atalho

**Decisão:** texto livre é o caminho principal. Câmera e upload de imagem são
opcionais, com prévia, opção de remover e aviso antes do envio.

**Por quê:** os mentores pediram que o produto não dependa de imagens. Foto de
despensa é imprecisa: não revela quantidades nem validade. Ela serve para
acelerar a lista, não para decidir sozinha. O aviso de envio existe porque a foto
sai do aparelho e vai para um modelo de IA.

## 4. A pessoa sempre confirma o que a IA entendeu

**Decisão:** tudo que o agente extrai chega como sugestão editável. Nomes e
quantidades podem ser corrigidos, e itens, removidos. Só o inventário confirmado
segue para o planejamento.

**Por quê:** se a IA errar um ingrediente, o erro se propaga para a receita e para
a compra. Corrigir na origem é mais barato e mantém a pessoa no controle.
Quantidades vindas de foto são descartadas de propósito.

## 5. Etiquetas de procedência em cada informação

**Decisão:** cada dado mostra de onde veio: **Você informou**, **Sugerido pela
IA**, **Dado do iFood (MCP)** e **Estimativa**.

**Por quê:** a confiança em um agente depende de saber o que é fato e o que é
palpite. Um preço vindo do MCP tem um peso diferente de uma quantidade inferida.
A distinção também evita que a demonstração confunda dados simulados com
integração real.

## 6. Perfil opcional, dados sensíveis com consentimento separado

**Decisão:** preferências (vegetariano, vegano, orgânico) ficam em seções
expansíveis e opcionais, sem etapa obrigatória de cadastro. Alergias,
intolerâncias e condições de saúde exigem marcar um consentimento explícito. O
agente pergunta sobre preferências no máximo uma vez.

**Por quê:** pedir dados demais logo no início afasta a pessoa. Dados de saúde
merecem um cuidado maior (LGPD), e sem consentimento a API os rejeita. Não
perguntar de novo respeita uma recusa.

## 7. Nada fica guardado por padrão

**Decisão:** o perfil vive só na memória da aba (sem `localStorage`), e cada
chamada reenvia o contexto completo, sem conversa guardada no servidor por padrão.

**Por quê:** é o comportamento mais seguro para um protótipo que lida com
preferências alimentares e de saúde. A persistência é opt-in no backend e fica
para o roadmap, com controles de privacidade adequados.

## 8. Explicações sob demanda

**Decisão:** os cards mostram o essencial (o que preparar, o que usa, o que
falta). Justificativas e detalhes ficam em seções expansíveis.

**Por quê:** a maioria quer decidir rápido. Quem quer entender o raciocínio do
agente consegue, sem poluir a tela de quem não quer.

## 9. Pedir login e localização só quando necessário

**Decisão:** a conexão com a conta iFood e a localização só são pedidas quando a
pessoa escolhe uma refeição que tem faltantes. Assim que as duas estão prontas, a
busca começa sozinha, uma vez. A localização vem do GPS do navegador ou pode ser
digitada.

**Por quê:** quem só quer uma ideia de receita não precisa fazer login. Pedir
permissões no momento em que fazem sentido aumenta a aceitação. A busca
automática evita um clique redundante, e a repetição só em caso de erro, por
ação explícita, evita loops e chamadas duplicadas.

## 10. Honestidade sobre limites

**Decisão:** a tela de produtos diz explicitamente que preços são observações do
momento, que embalagem, taxas e pedido mínimo precisam ser revisados e que nada
foi adicionado a um carrinho.

**Por quê:** um agente que exagera o que fez perde a confiança na primeira
divergência. Mostrar o total como "não confirmado" e separar frete de produto
evita que a pessoa compare um subtotal com o orçamento como se fosse o valor
final.

## 11. Estados vazios e erros são parte da experiência

**Decisão:** falha na busca, catálogo vazio, falta de login e falta de chave de
IA têm mensagens distintas e ações claras.

**Por quê:** "não encontramos produtos" e "a consulta falhou" pedem reações
diferentes da pessoa. Durante os testes, o modelo chegou a descrever uma falha
como resultado vazio, e por isso a mensagem de falha passou a ser determinística,
gerada pelo backend.

## Identidade visual

Interface responsiva em pt-BR, tema claro com vermelho de destaque e hierarquia
inspirada no iFood, para que a experiência pareça natural para quem já usa o app.
Alvos de toque grandes, foco visível e textos curtos.
