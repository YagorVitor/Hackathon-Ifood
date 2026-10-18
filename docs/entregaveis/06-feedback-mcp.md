# 06 — Feedback sobre os MCPs

Dificuldades reais encontradas ao integrar o MCP do iFood e uma proposta de
evolução pedida pelos mentores.

**Critério deste documento:** cada item diz se é **comportamento observado em
runtime**, **divergência na documentação** ou **sugestão**. Não registramos
falhas que não reproduzimos.

## Parte A — Achados da integração

### A1. Nome do filtro alimentar diverge entre guia e schema · *observado em runtime*

- **Guia** (Offer Discovery → tools): descreve `refinements.dietary` com
  VEGETARIAN, VEGAN e GLUTEN_FREE.
- **Schema anunciado por `tools/list`** (17/10/2026): usa
  `refinements.itemRestrictions` e enumera VEGETARIAN, VEGAN, LAC_FREE,
  GLUTEN_FREE, SUGAR_FREE e ORGANIC.
- **Impacto:** quem segue o guia monta um payload que não corresponde ao schema.
  Resolvemos validando os argumentos contra o schema em runtime antes de cada
  chamada.
- **Sugestão:** gerar a referência das tools a partir do mesmo schema servido
  pelo MCP.

Fonte: https://mcp-developer.ifood.com.br/pt-BR/docs/guides/mcps/discovery/tools

### A2. Ferramentas anunciadas não batem com o domínio documentado · *observado em runtime*

- Com o escopo `mcp.discovery.search.read`, o `tools/list` retornou
  `searchOffers`, `listVouchers` e `setVoucher`.
- `getItem` e `getMerchant`, documentadas no domínio Offer Discovery, **não**
  foram anunciadas. Por isso não conseguimos revalidar detalhe e preço de um item
  antes de mostrar ao usuário.
- `listVouchers` e `setVoucher` estão documentadas no domínio Cart, mas apareceram
  nessa sessão de escopo de busca.
- **Sugestão:** documentar a relação escopo → ferramentas anunciadas, ou trazer
  essa informação no próprio `tools/list`, para que o desenvolvedor saiba qual
  escopo pedir.

### A3. Envelope de erro diferente por domínio · *divergência na documentação*

- User e Discovery usam `errors`; Cart usa `error`; Order Tracking usa campos na
  raiz. Uma resposta HTTP de sucesso pode carregar erro de negócio.
- **Impacto:** o adaptador precisa normalizar transporte, JSON-RPC, `isError` e
  payload de domínio separadamente. Para um agente, isso aumenta o risco de
  tratar uma falha como "sem resultados". Isso aconteceu no nosso teste: o modelo
  descreveu uma falha de consulta como lista vazia, e passamos a gerar essa
  mensagem de forma determinística no backend.
- **Sugestão:** um envelope de erro único, com código estável e indicação de se a
  operação pode ser repetida.

### A4. Pontos do checkout que dependem de esclarecimento · *divergência na documentação*

Levantados na leitura da documentação de Cart. **Não testados em runtime**,
porque o MVP não chegou ao checkout.

- `setCartPayment` pede `cardTokenId` e orienta copiá-lo de
  `listPaymentMethods`, mas a referência compartilhada diz que esse campo é sempre
  `null` nessa listagem.
- Entrega agendada pede `selectedTimeSlotId`, mas o exemplo de timeslots mostra
  apenas `from`/`to`.
- O exemplo da visão geral usa um endpoint diferente do guia de instalação
  (`consumer-mcp.ifood.com.br/marketplace`), que é o que respondeu ao handshake.

### A5. Disponibilidade de catálogo para testes · *sugestão*

A busca depende de `userLocation`, e a disponibilidade varia por região. Um teste
com coordenadas fictícias retornou lista vazia, o que é o comportamento esperado.
Para hackathons e testes automatizados, ajudaria ter uma **localização ou loja de
referência documentada** para a conta de teste (`ONLY_TEST_AGENT`), com catálogo
estável, para validar o caminho com produtos sem depender de onde a equipe está.

## Parte B — Proposta de evolução: perfil contextual estruturado

Os mentores informaram que o iFood não tem hoje tags estruturadas de perfil
(vegetariano, intolerância à lactose, alergias, diabetes etc.) e pediram que
apresentássemos a ideia como sugestão para o MCP. **Isso não existe no MCP
atual**; a CompletAI mantém um perfil próprio, declarado pelo usuário.

### B1. Problema

Toda aplicação que usa o MCP precisa perguntar de novo as mesmas preferências. O
consumidor repete informações, e cada parceiro guarda uma cópia diferente, sem
controle central de consentimento.

### B2. Caso de uso

Uma pessoa vegetariana e intolerante à lactose pede ao agente: "o que faço para
o jantar com o que tenho?". Com autorização, o agente lê as preferências do
perfil iFood, aplica `itemRestrictions=[VEGETARIAN, LAC_FREE]` na busca e avisa
que o filtro não garante ausência de contaminação cruzada.

### B3. Limitação atual do protocolo

- `getUser` pode trazer uma descrição textual de comportamento, mas não um
  cadastro estruturado de preferências, restrições ou saúde.
- Não há escopo específico para ler ou escrever preferências, nem registro de
  consentimento por finalidade.

### B4. Contrato proposto (ilustrativo)

Novas ferramentas no domínio User: `getConsumerPreferences`,
`updateConsumerPreferences`, `deleteConsumerPreferences`.

```json
{
  "version": 3,
  "updatedAt": "2026-10-18T10:00:00-03:00",
  "preferences": {
    "dietary": ["VEGETARIAN"],
    "dislikes": ["coentro"],
    "shopping": { "maxDeliveryFee": 800, "prefersOrganic": false }
  },
  "sensitive": {
    "consent": { "granted": true, "purpose": "FOOD_RECOMMENDATION", "grantedAt": "2026-10-18T09:58:00-03:00" },
    "intolerances": ["LACTOSE"],
    "allergies": [],
    "healthConditions": []
  },
  "pets": [{ "species": "CAT", "ageRange": "ADULT" }],
  "source": "DECLARED_BY_USER"
}
```

**Escopos sugeridos:**

| Escopo | Acesso |
|---|---|
| `mcp.user.preferences.read` | Preferências comuns |
| `mcp.user.preferences.write` | Atualizar preferências comuns |
| `mcp.user.sensitive.read` | Bloco `sensitive`, com consentimento por finalidade |

### B5. Benefícios

- **Consumidor:** informa uma vez e controla em um lugar só o que cada aplicação
  vê.
- **Parceiros:** recomendações melhores desde a primeira interação, sem guardar
  dados sensíveis por conta própria.
- **iFood:** um contexto consistente entre Mercado, Farmácia e Petshop, incluindo
  o perfil de pets para reposição de ração.

### B6. Segurança, privacidade e LGPD

- **Separação rígida:** preferências comuns e dados de saúde (alergias,
  intolerâncias, condições) em blocos e escopos distintos. Dados de saúde são
  dados sensíveis pela LGPD (art. 11) e exigem consentimento específico.
- **Consentimento por finalidade**, com data, versão e revogação que se propaga
  para as aplicações.
- **Só dados declarados:** nunca inferir alergias ou condições de saúde a partir
  do histórico de compras ou de `userBehaviorDescription`.
- **Sem promessa clínica:** o contrato deve deixar claro que filtros de catálogo
  não garantem composição nem segurança para alergias.
- **Minimização:** a aplicação recebe só os campos do escopo concedido. Exclusão
  completa via `deleteConsumerPreferences`.
- **Auditoria:** registro de quais aplicações leram o bloco sensível e quando.
