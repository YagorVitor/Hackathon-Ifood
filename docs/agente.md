# Agente e reconhecimento de imagem

O projeto usa o **OpenAI Agents SDK para Python**, pacote `openai-agents`. O modelo é configurado em `OPENAI_MODEL`, com padrão `gpt-4.1-mini`.

## Execução

O backend monta um `AgentEnvelope` com mensagem, contexto e histórico autorizado. `Runner.run` executa o agente com saída estruturada `AgentDraft`, até seis turnos e limite de 2.200 tokens por resposta do modelo. A rota tem timeout de 90 segundos.

O modelo organiza ingredientes, objetivo, pessoas, tempo e orçamento declarados. Essas informações precisam de revisão antes de orientar a compra. Preferências já autorizadas são reutilizadas; quando ainda não foram perguntadas, o agente pode solicitar o preenchimento opcional.

As opções seguem três estratégias: `USE_WHAT_I_HAVE`, `COMPLETE_WITH_MARKET` e `CONVENIENCE`. Cada uma pode incluir complementos opcionais. Eles não entram automaticamente nos ingredientes faltantes nem autorizam uma busca.

## Busca

A função local `search_market_items(query, merchant_type)` chama `searchOffers`. Ingredientes usam normalmente `GROCERIES`; refeições prontas podem usar `RESTAURANT`. Sem vertical, consulta o catálogo geral. O nome da função não limita o catálogo ao iFood Mercado.

Há até três consultas por execução, incluindo ampliações de busca vazia. Consultas idênticas usam cache. A ampliação mantém o destino e os filtros. Uma falha não é tratada como ausência de ofertas.

A localização é usada pela ferramenta, fora do prompt. Ideias sem compra não exigem conexão iFood. Busca exige localização válida e autorização da conta.

## Resposta e regras comerciais

O modelo seleciona referências `offer_N`. `finalize` monta a saída usando os produtos observados naquela execução. Referências desconhecidas são descartadas. Custos conhecidos são calculados por opção; alternativas não são somadas como se fossem uma compra única.

`necessidades_quantidade` informa o total estimado de um ingrediente. Só se mantém a reposição de um item disponível quando há déficit conhecido na mesma unidade. Não há conversão presumida entre receita e embalagem.

Preferências e critérios explícitos geram filtros de catálogo. Diabetes não vira `SUGAR_FREE` automaticamente; alergia a leite não equivale a ausência de lactose. O agente não fornece garantia clínica.

Conteúdo do usuário, imagens e resultados comerciais são tratados como dados. As instruções proíbem obedecer comandos presentes em rótulos, nomes e descrições. A validação da saída e a separação das ações de escrita limitam o que o modelo pode executar.

## Fotos

`vision.py` usa um agente separado, sem ferramentas comerciais, com saída `ImageExtraction`. Aceita JPEG, PNG e WebP até 5 MB e 20 megapixels. Valida o formato real, rejeita animações, corrige orientação, remove metadados e reduz o lado maior a 2.048 pixels.

O processamento ocorre em memória. A foto não é salva em arquivo ou sessão. Quantidade e unidade reconhecidas são descartadas; os alimentos retornam como hipóteses para revisão. Objetivo, pessoas, tempo e orçamento só são extraídos do texto complementar, nunca da foto.

A análise não comprova validade, conservação ou conteúdo de recipientes fechados. As caixas desenhadas na foto da apresentação são ilustrativas e não são uma saída implementada pelo frontend.

Leia também: [API](api.md), [integração iFood](integracao-ifood.md) e [arquitetura](arquitetura.md).
