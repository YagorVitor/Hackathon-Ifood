# Arquitetura

A CompletAI usa React no frontend, FastAPI no backend e o OpenAI Agents SDK para interpretar o contexto e recomendar opções. O MCP oficial do iFood fornece ofertas e operações de carrinho.

## Responsabilidades

| Módulo | Função |
|---|---|
| `backend/app/main.py` | Rotas, ciclo de vida e coordenação das operações |
| `backend/app/context.py` | Contexto e histórico opcional de conversas |
| `backend/app/agent.py` | Agente e ferramenta local de busca |
| `backend/app/vision.py` | Validação e análise da imagem |
| `backend/app/recommendations.py` | Filtros, evidências e valores monetários |
| `backend/app/cart.py` | Proposta, confirmação e conferência do carrinho |
| `backend/app/ifood_mcp.py` | Descoberta, validação e execução das ferramentas MCP |
| `backend/app/oauth.py` | Autorização iFood e renovação de token |
| `backend/app/contracts.py` | Contratos Pydantic |

O agente recebe contexto e devolve recomendações estruturadas. A ferramenta disponível ao modelo é de busca. A criação de carrinho pertence ao backend e depende da confirmação do usuário. Produtos, lojas e preços são preenchidos a partir das respostas do MCP, sem aceitar dados comerciais inventados pelo modelo.

## Contexto e armazenamento

O frontend reenvia o contexto completo com `remember_context=false`. O perfil pode ser lembrado no navegador por escolha explícita. Inventário e carrinho não fazem parte desse perfil salvo.

A API também oferece sessões opcionais para outros clientes. Elas duram 30 minutos após o último turno gravado, mantêm até 12 mensagens e têm capacidade de 100 sessões. Um contexto enviado substitui o anterior por inteiro. Produtos, custos e buscas ficam fora do histórico salvo. A revogação de consentimento limpa o histórico antes da próxima chamada ao modelo, mesmo que ela falhe.

Tokens OAuth, conversas e estado comercial ficam em memória. A aplicação atende um usuário por processo, sem autenticação própria nem isolamento para uma implantação pública. Reiniciar o backend perde esse estado.

## Dados enviados e consentimento

A OpenAI recebe a mensagem, o contexto autorizado e os produtos observados usados na recomendação. Na captura por foto, recebe a imagem reprocessada e o texto complementar. Coordenadas e credenciais não entram no prompt. O SDK é configurado com `store=False` e tracing desativado.

O MCP recebe termos de busca, coordenadas e filtros; na criação, recebe os identificadores da loja, endereço e itens. Credenciais ficam no backend. O comando de execução desativa access logs para evitar o registro do código OAuth no callback.

Alergias, intolerâncias e saúde exigem consentimento. O frontend remove esses campos quando não autorizado, e a API rejeita dados sensíveis sem consentimento. Preferências não são inferidas pela foto. Filtros alimentares não comprovam composição ou adequação clínica.

## Contratos e manutenção

Os modelos Pydantic rejeitam campos desconhecidos. Valores monetários internos são inteiros em centavos; quantidades usam Decimal. Os tipos do frontend ficam em `frontend/src/types.ts` e precisam acompanhar alterações de contrato.

Os [schemas exportados](contracts/README.md) descrevem os formatos do agente e da imagem. Os contratos de carrinho também estão no OpenAPI gerado pela aplicação. Consulte a [referência da API](api.md) e o [fluxo MCP](integracao-ifood.md).

## Testes

O backend tem testes de autenticação, contexto, regras comerciais, agente, imagem, idioma, carrinho e erros MCP. O frontend testa acessibilidade, perfil e ciclo de vida. Os comandos ficam no [README principal](../README.md#testes-e-build). Os testes usam substitutos do modelo e do transporte; não criam pedidos reais.

## Próximos passos

As prioridades são concluir o caminho de compra de complementos sem faltantes, validar acessibilidade com usuários, medir conversão entre etapas e preparar isolamento e persistência por conta antes de uma publicação multiusuário. Pagamento, envio de pedido e histórico persistente de compras não fazem parte da versão atual.
