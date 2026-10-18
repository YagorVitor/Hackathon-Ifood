# Decisões arquiteturais

Registro das decisões que moldaram o sistema, no formato
**contexto → decisão → consequência**.

---

### DA-01 · Monólito modular com agente como biblioteca

**Contexto:** o plano original previa um serviço HTTP de agente separado do
backend. O prazo é de cerca de 30 horas.

**Decisão:** um único processo FastAPI. O agente é uma função (`run_agent`)
chamada dentro da requisição e não guarda estado.

**Consequência:** deploy e depuração simples, e o contexto fica todo no backend.
Escalar exige separar depois; a fronteira já está definida pelo `AgentEnvelope`.

---

### DA-02 · Um agente, uma ferramenta

**Contexto:** arquiteturas multiagente aumentam latência, custo e
imprevisibilidade.

**Decisão:** um único agente com uma única ferramenta comercial,
`search_market_items`.

**Consequência:** comportamento mais previsível e testável. Novas capacidades,
como o carrinho, entram como novas ferramentas do mesmo agente.

---

### DA-03 · Somente leitura nesta versão

**Contexto:** compras exigem confirmação explícita, e o carrinho do Mercado não
foi testado de ponta a ponta.

**Decisão:** nenhuma operação de escrita no MCP. Ferramentas de voucher
anunciadas por `tools/list` não são expostas ao agente.

**Consequência:** não há risco de ação comercial indevida, mas o fluxo para na
lista de produtos.

---

### DA-04 · O modelo não escreve dados comerciais

**Contexto:** LLMs podem inventar nomes, preços e IDs.

**Decisão:** o modelo escolhe produtos por referência local (`offer_N`). Nomes,
IDs e preços são copiados pelo backend dos resultados do MCP da execução atual.
Seleções sem evidência são descartadas.

**Consequência:** nenhum dado comercial exibido pode ter sido inventado pelo
modelo. O prompt também proíbe preços e nomes de lojas nos textos livres.

---

### DA-05 · Schema real acima da documentação

**Contexto:** o guia do Offer Discovery descreve `refinements.dietary`; o schema
anunciado em runtime usa `refinements.itemRestrictions`.

**Decisão:** os argumentos são validados contra o `inputSchema` anunciado pelo
próprio MCP (`jsonschema`, Draft 2020-12) antes de cada `tools/call`.

**Consequência:** uma mudança de schema no servidor resulta em erro claro (`502`)
em vez de chamada malformada. O schema real fica salvo como fixture de teste.

---

### DA-06 · Dinheiro em centavos inteiros

**Contexto:** `float` acumula erro de arredondamento.

**Decisão:** valores do MCP (BRL em reais) são convertidos com `Decimal` e
`ROUND_HALF_UP` para centavos inteiros. O contrato usa `int` estrito.

**Consequência:** somas exatas. A conversão de volta para reais só acontece ao
montar `maxItemPrice` e `maxDeliveryFee` e na formatação da interface.

---

### DA-07 · Custo conhecido, nunca total final

**Contexto:** quantidade de embalagens, taxas de serviço e pedido mínimo não são
conhecidos sem carrinho.

**Decisão:** o backend calcula subtotal e frete observados por opção, marca
`total_final=false` e nunca devolve "dentro do orçamento".

**Consequência:** a interface não induz a pessoa a comparar um subtotal com o
orçamento como se fosse o valor final.

---

### DA-08 · Contexto pertence ao backend

**Contexto:** a memória do modelo e as sessões da OpenAI ficariam fora do
controle de privacidade da aplicação.

**Decisão:** o agente recebe tudo pelo envelope a cada execução, com
`store=False` e tracing desligado. A sessão no servidor é opt-in
(`remember_context`).

**Consequência:** é possível apagar e revogar dados de forma determinística. O
frontend atual nem usa sessões; reenvia o contexto completo a cada chamada.

---

### DA-09 · Localização fora do prompt

**Contexto:** coordenadas são dado pessoal e não ajudam o modelo a planejar.

**Decisão:** `localizacao` é excluída do JSON enviado ao modelo. Ele recebe só
`localizacao_disponivel: true/false`. A ferramenta local usa as coordenadas.

**Consequência:** o modelo nunca vê nem infere coordenadas.

---

### DA-10 · Consentimento como regra de validação

**Contexto:** dados de saúde são sensíveis pela LGPD.

**Decisão:** o validador de `UserContext` rejeita restrições sensíveis sem
`consentimento_dados_sensiveis=true`. Revogar o consentimento numa sessão limpa
o histórico antes da próxima execução.

**Consequência:** a regra não depende do frontend nem do modelo.

---

### DA-11 · Restrições não viram garantias

**Contexto:** filtros de catálogo são classificação do vendedor, não análise de
composição.

**Decisão:** só intolerâncias consentidas a lactose e glúten viram filtros
(`LAC_FREE`, `GLUTEN_FREE`). Alergias e condições de saúde não geram filtros
automáticos. Diabetes não vira `SUGAR_FREE`.

**Consequência:** o sistema não promete segurança para alergias. Limitações
explícitas aparecem na resposta.

---

### DA-12 · Falha não é "vazio"

**Contexto:** em teste real, o modelo descreveu uma falha de consulta como
"nenhum produto encontrado".

**Decisão:** cada busca registra `status=error` ou `empty`. Se todas falharem ou
todas vierem vazias, o backend **substitui** a mensagem do modelo por uma
mensagem determinística.

**Consequência:** a pessoa sabe se deve tentar de novo ou mudar os critérios.
Há teste de regressão para isso.

---

### DA-13 · Retry só para transporte

**Contexto:** repetir erros de negócio ou de schema não resolve nada e pode
duplicar efeitos.

**Decisão:** no máximo um retry, e só quando a causa é falha de transporte
(`TransportError`, `TimeoutError`, `ConnectionError`).

**Consequência:** a busca é resiliente a quedas momentâneas sem mascarar erros
reais.

---

### DA-14 · Etapas visuais em vez de chat

**Contexto:** os mentores pediram para evitar uma interface só de conversa.

**Decisão:** o frontend é uma sequência de etapas com cards e etiquetas de
procedência. A mensagem do agente fica em seções expansíveis.

**Consequência:** decisões mais rápidas e dados comerciais visíveis. Ver
[Racional da Experiência](../../entregaveis/03-racional-experiencia.md).

---

### DA-15 · Captura por foto num agente separado, sem ferramentas

**Contexto:** fotos podem conter rótulos com instruções, metadados pessoais e
pouca informação confiável sobre quantidade e validade.

**Decisão:** a foto é validada e regravada em memória (sem metadados, até
2048 px) e enviada a um agente próprio, sem ferramentas e com uma única rodada.
O backend zera quantidade e unidade e devolve o mesmo contrato da captura por
texto. A foto não entra em sessão nem é reenviada no planejamento.

**Consequência:** uma injeção de prompt pela imagem não alcança o MCP. O
frontend trata texto e foto igual, e a pessoa sempre confirma os ingredientes.
Ver [Reconhecimento de imagem](../04-agente/reconhecimento-de-imagem.md).

---

### DA-16 · Contexto reconhecido só vale depois da revisão

**Contexto:** objetivo, pessoas, tempo e orçamento citados no texto aceleram a
revisão, mas uma leitura errada do orçamento mudaria filtros de preço.

**Decisão:** o agente devolve esses dados em `contexto_reconhecido`, sempre
`INFERRED` e não confirmados. O backend não os aplica a filtros nem custos; eles
só valem quando voltam dentro de `UserContext`, depois da confirmação.

**Consequência:** a revisão chega preenchida sem que uma interpretação errada
afete a busca.

## Veja também

- [Visão geral da arquitetura](visao-geral.md)
- [Segurança e privacidade](seguranca-e-privacidade.md)
