# Backend de teste do agente

Escopo inicial: OAuth do consumidor iFood, `tools/list` e uma chamada de leitura
`searchOffers` na vertical `GROCERIES`. Não cria carrinho nem envia pedido.

## Executar localmente

Requer Python 3.10 ou superior.

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Preencha `IFOOD_CLIENT_ID` e `IFOOD_CLIENT_SECRET` com as credenciais do agente.
Mantenha os escopos dentro dos valores aprovados para o agente no portal. O
callback deve ser exatamente `http://localhost:8000/auth/callback`.

```bash
set -a
source .env
set +a
uvicorn app.main:app --app-dir . --reload --port 8000
```

Abra `http://localhost:8000/auth/ifood` para consentir. Depois consulte
`http://localhost:8000/mcp/tools` ou use a documentação interativa em
`http://localhost:8000/docs`.

## Testar uma busca de Mercado

`POST /mcp/test-search` exige que a pessoa informe a localização que deseja usar.
As coordenadas serão enviadas ao iFood como localização da busca; não reutilize
coordenadas embutidas em demonstrações ou logs.

```json
{
  "query": "tomate",
  "latitude": -22.0,
  "longitude": -47.9
}
```

O endpoint chama `searchOffers` com `resultKind=ITEM`, `merchantType=GROCERIES`
e no máximo cinco resultados. Ele não inventa IDs, lojas ou preços.

## Limites deste protótipo

- Tokens e tentativas PKCE ficam apenas na memória do processo; reiniciar o
  servidor exige autenticar novamente. É uma simplificação para teste local,
  não armazenamento adequado para produção.
- O cliente MCP usa o SDK Python oficial e Streamable HTTP. A conexão real só é
  confirmada após autenticar e obter uma resposta válida do gateway.
- Não há agente LLM neste corte; ele valida a autenticação e a camada de tools
  que o agente chamará. O planejamento da Despensa Reversa permanece no próximo
  passo de implementação.
- O endpoint de busca é somente leitura. Localização precisa é dado pessoal:
  só envie coordenadas fornecidas para essa busca pela própria pessoa.
