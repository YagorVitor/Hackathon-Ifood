# CompletAI

A CompletAI ajuda a decidir o que preparar ou comprar a partir de uma ocasião, dos ingredientes disponíveis e das preferências do usuário. A entrada pode ser por texto, foto ou ditado. Depois de conferir as informações, a pessoa escolhe uma sugestão e pode buscar produtos no iFood Mercado ou opções prontas de restaurantes.

O projeto foi desenvolvido para o hackathon SEMCOMP × iFood, com o tema **Vendendo com Agentes**.

## Pitch

### Da intenção de compra ao carrinho no iFood

O pitch apresenta a CompletAI, a arquitetura com OpenAI Agents SDK e o uso do MCP oficial do iFood. A versão completa reúne os oito slides e seis telas da aplicação ao final, em um único HTML.

| Apresentação | Guia |
|---|---|
| [**Pitch com demonstração**](docs/pitch/completai-pitch-com-demo.html) | [**Como apresentar e atalhos**](docs/pitch/README.md) |
| Foto incorporada, notas e modo de tela cheia | Navegação por teclado e cronômetro |

Para assistir, baixe o HTML ou abra `docs/pitch/index.html` no navegador após clonar o projeto. No GitHub, o arquivo é exibido como código.

## Como funciona

1. O usuário conta o que precisa e pode enviar uma foto dos alimentos.
2. O agente organiza as informações para revisão.
3. A aplicação considera o perfil autorizado e apresenta sugestões.
4. Quando há uma compra, o usuário conecta o iFood e escolhe o endereço.
5. O agente busca ofertas. O usuário revisa os produtos e as quantidades.
6. Após confirmação, o backend cria o carrinho e consulta o resultado para conferi-lo.

O MVP termina no carrinho criado e conferido. Pagamento e envio do pedido não estão implementados. A criação pelo MCP também não garante que o carrinho apareça na sacola principal do aplicativo.

## Tecnologias e papel do agente

Usamos o **OpenAI Agents SDK para Python**, instalado pelo pacote `openai-agents`. O SDK executa o agente, disponibiliza a ferramenta de busca e recebe a resposta em um formato estruturado. O modelo padrão é `gpt-4.1-mini`, configurável pela variável `OPENAI_MODEL`. A leitura de fotos também usa um agente com entrada de imagem.

O **MCP oficial do iFood** fornece os dados comerciais e as operações de carrinho. A ferramenta local oferecida ao agente chama `searchOffers`; produtos, lojas e preços são preenchidos a partir da resposta do MCP. O agente não recebe uma ferramenta para criar carrinhos. Essa operação fica no backend e exige confirmação do usuário.

| Parte | Tecnologia | Responsabilidade |
|---|---|---|
| Interface | React, TypeScript, Vite e Tailwind CSS | Entrada, revisão, perfil, acessibilidade e carrinho |
| Backend | FastAPI e Pydantic | API, contratos, contexto e validações |
| Agente | OpenAI Agents SDK | Interpretar o contexto, recomendar e buscar ofertas |
| Integração iFood | Cliente MCP | Descobrir ferramentas, validar argumentos e executar chamadas |
| Autorização | OAuth com PKCE | Conectar a conta iFood e renovar o token |

## Requisitos

- Python 3.10 ou superior, com suporte a ambientes virtuais.
- Node.js 22 e npm.
- Chave da API OpenAI com acesso ao modelo configurado.
- Cliente autorizado no portal MCP do iFood, com Client ID, Client Secret e permissões para as ferramentas utilizadas.

As consultas ao modelo usam a API OpenAI e podem gerar cobrança na conta associada à chave.

## Baixar o projeto

```bash
git clone https://github.com/YagorVitor/Hackathon-Ifood.git
cd Hackathon-Ifood
git switch main
```

## Configurar o backend

Na raiz do projeto, crie o ambiente virtual e instale as dependências:

```bash
python3 -m venv backend/.venv
source backend/.venv/bin/activate
python -m pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
```

No Windows, pelo PowerShell:

```powershell
py -3 -m venv backend/.venv
.\backend\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
Copy-Item backend/.env.example backend/.env
```

Preencha `backend/.env` com suas credenciais:

```dotenv
IFOOD_CLIENT_ID=seu_client_id
IFOOD_CLIENT_SECRET=seu_client_secret
IFOOD_REDIRECT_URI=http://localhost:8000/auth/callback
IFOOD_SCOPES="mcp.discovery.search.read mcp.user.addresses.read mcp.cart.read mcp.cart.write"
IFOOD_MCP_URL=https://consumer-mcp.ifood.com.br/marketplace
OPENAI_API_KEY=sua_chave_openai
OPENAI_MODEL=gpt-4.1-mini
```

Cadastre no portal iFood o mesmo endereço de callback definido em `IFOOD_REDIRECT_URI`. Os escopos precisam estar autorizados para o cliente; escrever um escopo no arquivo não concede acesso. O `.env.example` contém apenas o escopo de busca por padrão. Para testar endereços e carrinho, configure os quatro escopos acima, conforme a autorização do portal.

Mantenha uma única linha para cada variável. As URLs devem ser texto simples, sem formatação de link. O arquivo `.env` fica fora do Git; as credenciais são usadas apenas pelo backend.

### Iniciar o backend

No terminal com o ambiente virtual ativo:

```bash
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --env-file .env --no-access-log
```

No Windows, partindo da raiz:

```powershell
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --env-file .env --no-access-log
```

Verifique [o estado do backend](http://localhost:8000/healthz). A resposta esperada é `{"status":"ok"}`. A [referência das rotas](http://localhost:8000/docs) fica disponível enquanto o servidor estiver rodando.

O comando não usa recarregamento automático. Depois de alterar código ou variáveis de ambiente, reinicie o backend. O login e o estado comercial ficam em memória e são perdidos no reinício; será necessário conectar o iFood novamente.

## Iniciar o frontend

Abra outro terminal na raiz do projeto:

```bash
cd frontend
npm ci
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Acesse [a CompletAI](http://127.0.0.1:5173). Mantenha os dois terminais abertos.

O Vite encaminha as chamadas de `/api`, `/auth` e `/health` para o backend na porta 8000. Não é necessário colocar chaves no frontend. Se a porta 5173 estiver ocupada, encerre a instância anterior antes de iniciar outra.

## Testar o fluxo com iFood

Use o botão de conexão na interface e conclua a autorização. Depois, informe um contexto, confira os dados e escolha uma sugestão que precise de produtos. Selecione um endereço da conta, aguarde a busca e revise o carrinho antes de confirmar.

| Ferramenta MCP | Uso |
|---|---|
| `searchOffers` | Buscar produtos para a localização e os critérios informados |
| `listAddresses` | Consultar os endereços da conta conectada |
| `createCart` | Criar o carrinho após confirmação |
| `getCart` | Consultar e conferir o carrinho criado |

O backend consulta `tools/list` e valida os argumentos pelo schema anunciado. Com a conta conectada, a rota `/api/integration/tools` mostra as ferramentas disponíveis para aquela conexão.

A confirmação chama `createCart` de verdade. Use a conta de teste disponibilizada para a integração. Se o resultado da criação for incerto, a aplicação bloqueia a repetição automática para evitar duplicidade.

## Testes e build

Backend, a partir de `backend`, com o ambiente virtual ativo:

```bash
python -m unittest discover -s tests -q
```

Frontend, a partir de `frontend`:

```bash
npm run test:accessibility
npm run test:profile
npm run test:lifecycle
npm run build
```

Os testes automatizados não substituem a verificação com uma conta autorizada no iFood. O build gera os arquivos estáticos em `frontend/dist`. Para publicar a aplicação, também será necessário configurar o backend, o encaminhamento das rotas e o callback OAuth do ambiente.

## Organização do código

```text
backend/
  app/
    main.py             Rotas da API
    agent.py            Agente e ferramenta de busca
    vision.py           Validação da foto e reconhecimento de alimentos
    context.py          Contexto e histórico da sessão
    recommendations.py  Filtros, produtos observados e valores monetários
    cart.py             Proposta, confirmação e conferência do carrinho
    ifood_mcp.py         Cliente MCP e validação das chamadas
    oauth.py            Autorização iFood
    contracts.py        Contratos de entrada e saída
  tests/
frontend/
  src/
    steps/              Etapas da jornada
    components/         Componentes compartilhados
    accessibility/      Idioma, aparência e recursos de voz
    hooks/              Conexão iFood e perfil
  tests/
```

## Recursos e limites desta versão

O perfil pode guardar preferências no navegador quando o usuário escolhe lembrar. Alergias, intolerâncias e condições de saúde exigem consentimento para entrar no contexto. Esses dados pertencem à aplicação; não são um perfil fornecido pelo iFood. Filtros alimentares não garantem adequação clínica ou ausência de alérgenos.

Fotos em JPEG, PNG e WebP são aceitas até 5 MB. Os alimentos reconhecidos precisam de revisão. O ditado depende do suporte do navegador e da permissão de microfone. A interface também oferece leitura em voz alta, português e inglês, temas, ajuste de texto, contraste e redução de movimento.

A aplicação sugere complementos opcionais. Ainda falta um caminho dedicado para comprá-los quando a opção principal não tem ingredientes faltantes.

O backend foi preparado para demonstração local com uma conta por processo. Conexão OAuth, conversas e carrinhos ficam em memória, sem isolamento de usuários para uma implantação pública. Também não há histórico persistente de compras.

## Problemas comuns

| Situação | O que conferir |
|---|---|
| Frontend não conecta | Backend ativo na porta 8000 e frontend iniciado pelo Vite |
| Login retorna `invalid_scope` | Escopos autorizados no portal e ausência de linhas duplicadas no `.env` |
| Endereços ou carrinho indisponíveis | Permissões da conta e ferramentas anunciadas em `/api/integration/tools` |
| Credencial ou escopo foi alterado | Reiniciar o backend e conectar o iFood novamente |
| Busca sem produtos | Endereço, critérios e disponibilidade retornada pelo catálogo |
| Carrinho não aparece no app | A criação via MCP não confirma sincronização com a sacola principal |
| Microfone ou câmera indisponível | Permissões e suporte do navegador; texto e upload continuam disponíveis |

## Documentação

O [índice de documentação](docs/README.md) reúne os guias técnicos, os contratos e os entregáveis do hackathon.
