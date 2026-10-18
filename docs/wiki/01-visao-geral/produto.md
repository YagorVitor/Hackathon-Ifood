# Produto

## O que é

A **Despensa Reversa** é um agente de conveniência para o iFood Mercado. Em vez
de começar pela busca de produtos, ele começa pelo que a pessoa já tem em casa:

> "Antes de descobrir o que você quer comprar, entendemos o que você realmente
> precisa."

A pessoa descreve os alimentos que tem e o que quer preparar. O agente organiza
essas informações, propõe refeições e, se faltar algo, consulta produtos reais no
iFood Mercado pelo **MCP oficial do iFood**.

## Para quem

Consumidores que cozinham em casa com tempo e orçamento limitados e querem
aproveitar melhor o que já compraram: estudantes, quem mora sozinho, famílias
pequenas.

## O problema

- As pessoas não sabem o que preparar com os alimentos disponíveis.
- Compras são feitas sem considerar o que já existe em casa (duplicidade e
  desperdício).
- Preferências e restrições alimentares precisam ser repetidas a cada busca.
- Apps de compra partem do catálogo e não do contexto do consumidor.

## Proposta de valor

Transformar informações desestruturadas sobre a vida do consumidor em
necessidades de compra estruturadas e acionáveis. O agente recomenda uma compra
**quando ela faz sentido**; se dá para cozinhar só com o que existe em casa, ele
diz isso.

## As três estratégias

O agente propõe até três opções, cada uma com uma estratégia (`estrategia` no
contrato):

| Valor no código | Na interface | Significado |
|---|---|---|
| `USE_WHAT_I_HAVE` | Aproveitar o que tenho | Refeição só com ingredientes confirmados, sem compra |
| `COMPLETE_WITH_MARKET` | Completar no Mercado | Refeição que precisa de alguns faltantes, buscados no iFood Mercado |
| `CONVENIENCE` | Conveniência | Produto pronto ou de preparo rápido, quando há opção adequada |

## Princípios do produto

1. **Contexto antes do catálogo.** O ponto de partida é a despensa, não a busca.
2. **A pessoa confirma o que a IA entendeu.** Tudo que o agente extrai é
   sugestão editável até ser confirmado.
3. **Nenhum dado comercial inventado.** Nome, preço, loja e IDs vêm só do MCP,
   na execução atual.
4. **Transparência de procedência.** Cada informação diz se foi declarada,
   inferida, obtida do MCP ou estimada.
5. **Perfil opcional e com consentimento.** Dados sensíveis (alergias,
   intolerâncias, saúde) só com autorização explícita. Sem promessa clínica.
6. **Nenhuma ação comercial sem confirmação.** Nesta versão, nenhuma ação
   comercial é executada.

## Escopo do MVP

| Dentro | Fora (roadmap) |
|---|---|
| Entrada por texto e por foto (câmera ou upload) | Entrada por voz e dispositivos |
| Revisão e correção dos ingredientes | Perfil persistente entre sessões |
| Preferências e restrições declaradas | Perfis familiares |
| Sugestões nas três estratégias | Fluxos de Farmácia e Petshop |
| Busca real no iFood Mercado (`searchOffers`) | Carrinho e pedido (`createCart`, `submitOrder`) |
| Custos observados por opção | Total final e revalidação de preço |
| Objetivo, pessoas, tempo e orçamento extraídos do texto para revisão | Medição da precisão do reconhecimento em fotos reais |

## Verticais

O MVP cobre o **iFood Mercado** (`merchantType=GROCERIES`). A arquitetura foi
pensada para receber **Farmácia** (`DRUGSTORE`) e **Petshop** (`PETSTORE`), que
os mentores apontaram como estratégicas, trocando apenas as regras da vertical.

## Veja também

- [Estado atual](estado-atual.md)
- [Fluxo da aplicação](../02-arquitetura/fluxo-da-aplicacao.md)
- [`docs/HACKATHON_CONTEXT.md`](../../HACKATHON_CONTEXT.md), o contexto mestre
  com o feedback dos mentores
