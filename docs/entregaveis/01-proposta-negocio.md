# 01 — Proposta de Negócio

**Despensa Reversa** · Hackathon SEMCOMP × iFood 2026 — Vendendo com Agentes

> "Antes de descobrir o que você quer comprar, entendemos o que você realmente precisa."

## O problema

Aplicativos de compra começam pela busca: a pessoa precisa saber o que quer
antes de abrir o app. No dia a dia da alimentação, porém, a pergunta real costuma
ser outra: *"o que eu faço com o que já tenho em casa?"*.

Hoje, quem faz essa pergunta precisa:

- Descobrir sozinho o que preparar com os alimentos disponíveis.
- Montar mentalmente a lista do que falta antes de virar uma compra.
- Comprar sem considerar o que já existe em casa, o que gera duplicidade e
  desperdício.
- Repetir preferências e restrições alimentares (vegetariano, sem lactose…) a
  cada busca, porque elas não ficam estruturadas em lugar nenhum.

## Para quem

Consumidores do iFood Mercado que cozinham em casa com tempo e orçamento
limitados: estudantes, pessoas que moram sozinhas e famílias pequenas que querem
aproveitar melhor o que já compraram.

## Proposta de valor

A Despensa Reversa é um agente de conveniência que **transforma informações
desestruturadas sobre a vida do consumidor em necessidades de compra estruturadas
e acionáveis**.

A pessoa descreve (ou fotografa) o que tem, diz o objetivo ("jantar para duas
pessoas, 30 minutos, até R$ 35") e o agente:

1. Organiza os ingredientes para ela conferir e corrigir.
2. Propõe refeições considerando perfil, tempo, pessoas e orçamento.
3. Separa o que já está em casa do que falta.
4. Consulta produtos **reais** no iFood Mercado pelo MCP oficial, só para o que
   falta.
5. Mostra preços observados, loja e limitações, sem inventar dados.

O agente **não tenta vender a qualquer custo**. Quando dá para preparar algo só
com o que existe em casa, ele recomenda isso. A compra aparece quando faz sentido.

## Três estratégias de decisão

| Estratégia | Quando | Resultado |
|---|---|---|
| **Aproveitar o que tenho** | Os ingredientes bastam | Receita sem compra |
| **Complementar pelo Mercado** | Faltam poucos itens | Lista de faltantes com produtos reais do iFood Mercado |
| **Conveniência** | Pouco tempo ou nada combina | Produtos prontos ou de preparo rápido, se houver no catálogo |

## Diferencial

- **Comércio reverso:** o ponto de partida é o contexto do consumidor, não o
  catálogo.
- **Menos desperdício:** a compra considera o que já existe em casa.
- **Perfil declarado e com consentimento:** preferências são opcionais, e dados
  sensíveis (alergias, intolerâncias, saúde) só são usados com consentimento
  explícito. O agente nunca promete adequação clínica.
- **Transparência:** cada informação na tela diz de onde veio: *você informou*,
  *sugerido pela IA*, *dado do iFood (MCP)* ou *estimativa*.
- **Validado com os mentores:** a proposta foi apresentada aos mentores do iFood
  durante o evento, com retorno positivo.

## Valor para o iFood

- **Novo ponto de entrada para o Mercado:** captura a intenção de compra antes
  de ela virar uma busca, e muitas vezes antes de a pessoa saber que vai comprar.
- **Cesta mais assertiva:** a lista vem só com o que realmente falta, o que tende
  a reduzir arrependimento e abandono.
- **Expansão para verticais estratégicas:** a mesma arquitetura atende
  **Farmácia** (reposição de higiene e cuidados pessoais) e **Petshop**
  (reposição de ração com base no perfil do animal), verticais que os mentores
  apontaram como prioritárias para crescimento.
- **Insumo para o MCP:** a necessidade de um perfil contextual estruturado virou
  uma proposta de evolução do protocolo (ver
  [06 — Feedback sobre os MCPs](06-feedback-mcp.md)).

## O que está no MVP e o que é roadmap

| No MVP (funcionando) | Roadmap |
|---|---|
| Entrada por texto, com revisão de ingredientes | Entrada por voz e por dispositivos (ex.: óculos inteligentes) |
| Preferências e restrições declaradas, com consentimento | Perfil persistente e perfis familiares |
| Sugestões nas três estratégias | Fluxos de Farmácia e Petshop |
| Busca real no iFood Mercado via MCP (`searchOffers`) | Montagem de carrinho e pedido pelo MCP (`createCart`, `submitOrder`) |
| Custos observados por opção, em centavos | Revalidação de preço e total final da loja |

O MVP **ainda não cria carrinho nem faz pedidos**. Essa limitação é assumida e
explicada em [05 — Documento Técnico](05-documento-tecnico.md).
