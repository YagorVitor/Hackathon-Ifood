# Wiki — CompletAI

Base de conhecimento técnica da aplicação **CompletAI**, construída no
Hackathon SEMCOMP × iFood 2026 — *Vendendo com Agentes*.

> Um agente que entende o que você já tem em casa, planeja a refeição e busca
> no iFood Mercado **só o que falta**, usando o MCP oficial do iFood.

Esta wiki descreve o sistema **como ele está no código** (branch `develop`).
Quando algo foi planejado mas não existe, está marcado como tal.

## Comece pela sua necessidade

| Eu quero… | Comece por | Depois leia |
|---|---|---|
| Entender o produto em 5 minutos | [Produto](01-visao-geral/produto.md) | [Estado atual](01-visao-geral/estado-atual.md) → [Fluxo da aplicação](02-arquitetura/fluxo-da-aplicacao.md) |
| Rodar a aplicação na minha máquina | [Como rodar](06-operacao/como-rodar.md) | [Configuração](03-backend/configuracao.md) |
| Preparar a demonstração ou o pitch | [Como rodar · Roteiro de demonstração](06-operacao/como-rodar.md#5-roteiro-de-demonstração) | [Estado atual](01-visao-geral/estado-atual.md) → [`docs/entregaveis/`](../entregaveis/README.md) |
| Entender a arquitetura | [Visão geral da arquitetura](02-arquitetura/visao-geral.md) | [Decisões arquiteturais](02-arquitetura/decisoes-arquiteturais.md) → [Contratos de dados](02-arquitetura/contratos-de-dados.md) |
| Resolver um erro | [Solução de problemas](06-operacao/solucao-de-problemas.md) | [Referência da API](03-backend/api-referencia.md) |
| Criar ou alterar um endpoint | [Visão geral do backend](03-backend/README.md) | [Referência da API](03-backend/api-referencia.md) → [Contratos de dados](02-arquitetura/contratos-de-dados.md) → [Testes](03-backend/testes.md) |
| Mudar regras de preço, filtros ou custos | [Regras de negócio](03-backend/regras-de-negocio.md) | [Saída estruturada](04-agente/saida-estruturada.md) → [Testes](03-backend/testes.md) |
| Mudar o comportamento do agente | [Visão geral do agente](04-agente/README.md) | [Instruções e políticas](04-agente/instrucoes-e-politicas.md) → [Ciclo de execução](04-agente/ciclo-de-execucao.md) |
| Integrar uma ferramenta nova do MCP (ex.: carrinho) | [Integração MCP](03-backend/integracao-mcp.md) | [Ferramenta `search_market_items`](04-agente/ferramenta-search-market-items.md) → [Limitações e roadmap](06-operacao/limitacoes-e-roadmap.md) |
| Mexer na captura por foto | [Reconhecimento de imagem](04-agente/reconhecimento-de-imagem.md) | [Componentes](05-frontend/componentes.md) → [Segurança e privacidade](02-arquitetura/seguranca-e-privacidade.md) |
| Mexer no login do iFood | [Autenticação OAuth](03-backend/autenticacao-oauth.md) | [Segurança e privacidade](02-arquitetura/seguranca-e-privacidade.md) |
| Alterar uma tela | [Fluxo de telas](05-frontend/fluxo-de-telas.md) | [Componentes](05-frontend/componentes.md) → [Design e acessibilidade](05-frontend/design-e-acessibilidade.md) |
| Entender como o frontend fala com o backend | [Estado e integração](05-frontend/estado-e-integracao.md) | [Referência da API](03-backend/api-referencia.md) |
| Revisar privacidade e LGPD | [Segurança e privacidade](02-arquitetura/seguranca-e-privacidade.md) | [Contexto e sessões](03-backend/contexto-e-sessoes.md) |
| Saber o que falta fazer | [Limitações e roadmap](06-operacao/limitacoes-e-roadmap.md) | [Estado atual](01-visao-geral/estado-atual.md) |
| Atualizar a documentação depois de mudar o código | [Manutenção da wiki](MANUTENCAO.md) | [Índice da wiki](INDICE.md) |
| Ver todas as páginas e como se ligam | [Índice da wiki](INDICE.md) | — |
| Entender um termo | [Glossário](01-visao-geral/glossario.md) | — |

## Mapa da wiki

### Entrada e manutenção
| Página | Conteúdo |
|---|---|
| [Índice da wiki](INDICE.md) | Todas as páginas, os links entre elas e um mapa visual (gerado por script) |
| [Manutenção da wiki](MANUTENCAO.md) | Como atualizar a wiki quando o código muda, convenções e checklist |

### 1. Visão geral
| Página | Conteúdo |
|---|---|
| [Produto](01-visao-geral/produto.md) | O que é, para quem, princípios e escopo do MVP |
| [Estado atual](01-visao-geral/estado-atual.md) | O que funciona, o que não funciona e lacunas conhecidas |
| [Glossário](01-visao-geral/glossario.md) | Termos usados no código e nos documentos |

### 2. Arquitetura
| Página | Conteúdo |
|---|---|
| [Visão geral da arquitetura](02-arquitetura/visao-geral.md) | Camadas, componentes, stack e modelo de processo |
| [Fluxo da aplicação](02-arquitetura/fluxo-da-aplicacao.md) | Ponta a ponta, com diagramas de sequência |
| [Contratos de dados](02-arquitetura/contratos-de-dados.md) | Modelos Pydantic, JSON trocado, procedência e dinheiro |
| [Decisões arquiteturais](02-arquitetura/decisoes-arquiteturais.md) | Registro das decisões e seus motivos |
| [Segurança e privacidade](02-arquitetura/seguranca-e-privacidade.md) | Credenciais, dados sensíveis, consentimento, LGPD |

### 3. Backend (FastAPI)
| Página | Conteúdo |
|---|---|
| [Visão geral do backend](03-backend/README.md) | Estrutura de pastas e mapa dos módulos |
| [Configuração](03-backend/configuracao.md) | Variáveis de ambiente e dependências |
| [Referência da API](03-backend/api-referencia.md) | Todos os endpoints, entradas, saídas e erros |
| [Autenticação OAuth](03-backend/autenticacao-oauth.md) | OAuth 2.0 + PKCE do consumidor iFood |
| [Integração MCP](03-backend/integracao-mcp.md) | Cliente MCP, validação por schema e retry |
| [Contexto e sessões](03-backend/contexto-e-sessoes.md) | `ConversationStore`, TTL e revogação de consentimento |
| [Regras de negócio](03-backend/regras-de-negocio.md) | Filtros, evidências do catálogo, custos em centavos |
| [Testes](03-backend/testes.md) | Suíte automatizada e exportação de contratos |

### 4. Agente (OpenAI Agents SDK)
| Página | Conteúdo |
|---|---|
| [Visão geral do agente](04-agente/README.md) | Papel, modelo, limites e o que ele não faz |
| [Ciclo de execução](04-agente/ciclo-de-execucao.md) | O que acontece em cada chamada a `run_agent` |
| [Instruções e políticas](04-agente/instrucoes-e-politicas.md) | O prompt de sistema, seção por seção |
| [Ferramenta `search_market_items`](04-agente/ferramenta-search-market-items.md) | A única ferramenta do agente |
| [Saída estruturada](04-agente/saida-estruturada.md) | `AgentDraft` → `AgentOutput` e a sanitização |
| [Reconhecimento de imagem](04-agente/reconhecimento-de-imagem.md) | Captura por foto: validação da imagem e agente sem ferramentas |

### 5. Frontend (React)
| Página | Conteúdo |
|---|---|
| [Visão geral do frontend](05-frontend/README.md) | Stack, estrutura e build |
| [Fluxo de telas](05-frontend/fluxo-de-telas.md) | Máquina de estados das etapas e mensagens enviadas |
| [Estado e integração com a API](05-frontend/estado-e-integracao.md) | Estado do `App`, cliente HTTP, erros e timeouts |
| [Componentes](05-frontend/componentes.md) | Etapas, componentes de UI e câmera |
| [Design e acessibilidade](05-frontend/design-e-acessibilidade.md) | Tokens visuais, procedência e práticas de a11y |

### 6. Operação
| Página | Conteúdo |
|---|---|
| [Como rodar](06-operacao/como-rodar.md) | Passo a passo do ambiente local |
| [Solução de problemas](06-operacao/solucao-de-problemas.md) | Sintomas, causas e correções |
| [Limitações e roadmap](06-operacao/limitacoes-e-roadmap.md) | O que falta e o que vem depois |

## Mantendo a wiki atualizada

Mudou o código? Atualize a wiki **no mesmo commit**. A tabela "arquivo alterado →
páginas a revisar" está em [Manutenção da wiki](MANUTENCAO.md). Depois, rode:

```bash
python docs/wiki/_scripts/gerar_indice.py
```

## Outros documentos do repositório

| Documento | Papel |
|---|---|
| [`docs/HACKATHON_CONTEXT.md`](../HACKATHON_CONTEXT.md) | Contexto mestre do produto e feedback dos mentores |
| [`docs/PLANO-BACKEND.md`](../PLANO-BACKEND.md) | Plano original do backend (parte não implementada) |
| [`docs/IMPLEMENTACAO-AGENTE.md`](../IMPLEMENTACAO-AGENTE.md) | Verificação real feita em 17/10/2026 |
| [`docs/RESUMO-GERAL-DO-SISTEMA.md`](../RESUMO-GERAL-DO-SISTEMA.md) | Diagnóstico inicial e capacidades documentadas do MCP |
| [`docs/entregaveis/`](../entregaveis/README.md) | Os seis entregáveis obrigatórios do hackathon |
| [`docs/contracts/`](../contracts/) | JSON Schemas exportados dos contratos |
