# Como rodar

Ambiente local completo: backend em `:8000` e frontend em `:5173`.

## Pré-requisitos

| Ferramenta | Versão |
|---|---|
| Python | 3.11 ou superior |
| Node.js + npm | Compatível com Vite 5 (Node 18+) |
| Conta OpenAI | Chave de API |
| Portal iFood | Client ID e secret do agente, callback `http://localhost:8000/auth/callback` (só para a busca no Mercado) |

## 1. Backend

### Linux / macOS

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

### Windows (PowerShell)

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

### Preencher o `.env`

```dotenv
IFOOD_CLIENT_ID=<client id do portal>
IFOOD_CLIENT_SECRET=<client secret do portal>
IFOOD_REDIRECT_URI=http://localhost:8000/auth/callback
IFOOD_SCOPES=mcp.discovery.search.read
IFOOD_MCP_URL=https://consumer-mcp.ifood.com.br/marketplace
OPENAI_API_KEY=<sua chave>
OPENAI_MODEL=gpt-4.1-mini
```

Sem as variáveis do iFood, as sugestões de refeição funcionam; só a busca no
Mercado fica indisponível.

### Subir

```bash
uvicorn app.main:app --env-file .env --host 127.0.0.1 --port 8000 --no-access-log
```

- `--no-access-log` evita registrar o código OAuth da URL de callback.
- **Não use `--reload` na demonstração:** tokens e sessões ficam em memória, e um
  reinício exige novo login.

### Conferir

```bash
curl http://localhost:8000/health
# {"status":"ok"}
```

O OpenAPI fica em <http://localhost:8000/docs>.

## 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Abra <http://localhost:5173>. A pílula no cabeçalho deve mostrar "Conecte ao
buscar no Mercado" (backend no ar, sem login).

## 3. Conectar a conta iFood

Pela interface, isso acontece na etapa "Só o que falta". Para testar antes:

1. Abra <http://localhost:8000/auth/login>.
2. Faça login no iFood e autorize.
3. A página "Conta iFood conectada" aparece.
4. Confira as ferramentas em <http://localhost:8000/mcp/tools>.

## 4. Testar a busca sem o modelo

```bash
curl -X POST http://localhost:8000/mcp/test-search \
  -H "Content-Type: application/json" \
  -d '{"query":"tomate","latitude":-22.0087,"longitude":-47.8909}'
```

Use coordenadas de um endereço real com cobertura do iFood Mercado. Coordenadas
fictícias (como `0,0`) devolvem lista vazia.

## 5. Roteiro de demonstração

1. Clique em "Experimentar com um exemplo" e depois em "Descobrir o que
   preparar". Se quiser mostrar a foto, anexe uma imagem com alimentos (e o
   texto, para objetivo e orçamento).
2. Na revisão, confira os ingredientes e a seção "Seu pedido", que chega
   preenchida com o que o agente entendeu do texto.
3. Em preferências, marque "Vegetariano" para mostrar o filtro.
4. Confirme e escolha uma opção **com faltantes**.
5. Conecte a conta iFood (nova aba) e volte.
6. Clique em "Usar minha localização atual" ou informe as coordenadas.
7. Mostre os produtos com o selo "Dado do iFood (MCP)" e o custo conhecido.

> **Foto na demonstração:** funciona, mas foi validada só com imagens de teste e
> a câmera física ainda não foi testada num aparelho. Teste antes com o aparelho
> da apresentação e deixe o caminho por texto pronto como alternativa.

## 6. Testes

```bash
cd backend
python -m unittest discover -s tests -v

cd ../frontend
npm run build
```

## Veja também

- [Configuração](../03-backend/configuracao.md)
- [Solução de problemas](solucao-de-problemas.md)
