# 05. Documento Técnico Resumido

## Arquitetura

- **Frontend:** React 18, TypeScript, Vite e Tailwind CSS 4. Controla o fluxo, revisão, acessibilidade e perfil opcional no navegador.
- **API:** FastAPI e contratos Pydantic. Organiza contexto, OAuth, imagens, evidências comerciais e carrinho.
- **Agente:** OpenAI Agents SDK com saída estruturada. Modelo configurável por `OPENAI_MODEL`, com padrão `gpt-4.1-mini`.
- **MCP:** adaptador em `backend/app/ifood_mcp.py`, usando cliente MCP, descoberta paginada de ferramentas e validação dos argumentos contra o schema anunciado.
- **Estado:** conversas, conexão OAuth e carrinho em memória do backend; perfil lembrado opcionalmente no armazenamento local do navegador.

```text
Frontend React
    → FastAPI
        → context.py / vision.py: contexto e extração da foto
        → agent.py: interpretação e recomendações via OpenAI
            → ferramenta local de busca → ifood_mcp.py → searchOffers
        → cart.py: evidências, proposta e controle da confirmação
            → ifood_mcp.py → listAddresses / createCart / getCart
        → oauth.py: autorização iFood com PKCE e renovação de token
```

## Uso do MCP

| Ferramenta | Responsável | Uso implementado |
|---|---|---|
| `searchOffers` | Ferramenta de leitura exposta ao agente | Buscar ofertas para a localização e critérios autorizados |
| `listAddresses` | Backend | Recuperar destinos da conta conectada |
| `createCart` | Backend, após confirmação | Criar carrinho de uma loja com os itens revisados |
| `getCart` | Backend | Ler e conferir o carrinho criado |

O agente não recebe uma ferramenta de criação de carrinho. Ele seleciona referências observadas; o backend resolve dados comerciais a partir dessas evidências. `tools/list` consulta capacidades, incluindo paginação, antes da chamada; nomes ou argumentos incompatíveis são rejeitados.

OAuth usa Authorization Code com PKCE S256 e validação de `state`. Os escopos são configuráveis. Para o fluxo completo implementado, a configuração usada deve contemplar busca, endereços e leitura e escrita de carrinho conforme as permissões concedidas ao cliente. A configuração padrão contém apenas o escopo de busca e precisa ser ampliada para demonstrar o carrinho.

## Controles principais

- Até três buscas por execução do agente, com cache de consultas idênticas e filtro de parceiros abertos.
- Coordenadas e credenciais ficam fora do prompt do modelo; são usadas pela ferramenta local.
- Valores monetários internos em centavos; totais ausentes permanecem desconhecidos.
- Proposta de carrinho com validade de 10 minutos; evidências de catálogo com validade de 30 minutos.
- Produtos vinculados à loja e ao destino da busca, com revisão de quantidades e confirmação explícita.
- Proteção contra repetição automática de criação com resultado incerto; verificação posterior por `getCart`.
- Nova conexão iFood invalida estado comercial anterior.
- Imagens JPEG/PNG/WebP até 5 MB e 20 megapixels, validadas e reprocessadas sem metadados; reconhecimento tratado como hipótese.
- Preferências e dados sensíveis separados; consentimento controla envio de alergias e intolerâncias e saúde. Condição de saúde não vira filtro clínico automaticamente.

## Testes

O repositório inclui testes de OAuth, agente, carrinho, erros MCP, visão e idioma no backend, além de perfil, acessibilidade e ciclo de vida no frontend. As suítes não foram reexecutadas nesta revisão editorial.

## Escopo operacional

A arquitetura atual é de demonstração local de um usuário. OAuth e estado comercial são compartilhados no processo. Reiniciar o backend perde o estado em memória. Faltam persistência por usuário, autenticação própria e instrumentação completa para operação pública.

Não há pagamento ou envio de pedido implementado. Criar e consultar um carrinho não comprova que ele aparecerá na sacola principal do aplicativo. A aplicação só utiliza links retornados e validados.
