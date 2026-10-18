# Solução de problemas

## Interface

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Pílula "Backend fora do ar" | Backend parado ou fora da porta 8000 | Suba o uvicorn em `127.0.0.1:8000` e clique em "Tentar reconectar" |
| "O serviço de sugestões está indisponível no momento" / "Configure OPENAI_API_KEY no backend." | `OPENAI_API_KEY` ausente (`503`) | Preencha o `.env` e reinicie o backend |
| Ao analisar uma foto, aparece "Not Found" | Backend antigo, sem a rota de imagem | Atualize o `develop`, rode `pip install -r requirements.txt` (agora inclui `pillow`) e reinicie o backend |
| "A imagem deve ter no máximo 5 MB." / "…grande demais" | Arquivo acima de 5 MB ou de 20 megapixels (`413`) | Use uma foto menor ou a câmera do app, que já reduz para 2048 px |
| "Envie uma imagem JPEG, PNG ou WebP." | Formato não aceito, conteúdo diferente da extensão ou imagem animada (`415`) | Converta para JPEG (HEIC não é aceito) |
| "Imagem ou texto inválido…" | Arquivo corrompido ou JSON inválido (`422`) | Escolha outra foto |
| "Não foi possível analisar a foto…" | Falha do modelo (`502`) ou modelo sem suporte a imagens | Tente de novo; confira se `OPENAI_MODEL` aceita imagens |
| A foto volta sem ingredientes | O modelo não reconheceu alimentos | Use uma foto mais nítida e iluminada ou descreva em texto |
| Na revisão, "Seu pedido" vem vazio | O texto não citava objetivo, pessoas, tempo ou orçamento (ou foi só foto, sem texto) | Preencha à mão (é opcional) |
| "Conexão com o iFood necessária" na busca | Sem login ou backend reiniciado (`401`) | Clique em "Conectar conta iFood" de novo |
| Conectei, mas a pílula não muda | O app só reconsulta ao voltar o foco para a aba | Volte para a aba ou clique em "Já conectei, verificar" |
| "Nenhum produto encontrado" | Localização sem cobertura ou filtros muito restritivos | Use coordenadas de um endereço real; remova preferências; aumente o orçamento |
| "A consulta ao iFood falhou" | Erro de transporte ou de negócio no MCP | Tente de novo; veja o log do backend; teste com `/mcp/test-search` |
| "O iFood não foi consultado nesta resposta" | O modelo respondeu sem chamar a ferramenta | Clique em "Consultar de novo" |
| "O agente excedeu o tempo de execução" | O modelo ou o MCP passaram de 90 s (`504`) | Tente de novo; menos faltantes deixam a busca mais rápida |
| "O agente não produziu uma resposta válida" | Falha do modelo ou saída inválida (`502`) | Tente de novo; confira a chave e o modelo |
| "Alguns dados não foram aceitos: …" | Validação (`422`) | Revise os campos indicados |
| Câmera não abre | Contexto não seguro, permissão negada ou câmera em uso | Use `localhost` ou HTTPS; autorize no navegador; ou "Escolher foto salva" |
| "Permissão de localização negada" | O navegador bloqueou o GPS | Informe as coordenadas manualmente |
| Requisições lentas com duas abas abertas | O backend serializa as execuções do agente (lock global) | Use uma aba por vez |

## Backend e OAuth

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| `/auth/login` responde `503` | `IFOOD_CLIENT_ID` ou `IFOOD_CLIENT_SECRET` ausentes | Preencha o `.env` e reinicie |
| `/mcp/tools` responde `500` | Credenciais iFood ausentes (o `RuntimeError` não é convertido em HTTP) | Preencha o `.env` |
| Callback responde `400` "state OAuth inválido ou expirado" | Mais de 10 min entre login e callback, backend reiniciado no meio ou `state` reutilizado | Recomece por `/auth/login` |
| Callback responde `400` "Autorização iFood não concluída." | Login cancelado ou negado no iFood | Recomece e autorize |
| Callback responde `502` | Secret errado, `redirect_uri` diferente do portal ou resposta sem `refresh_token` | Confira o portal e o `.env` |
| `401` "A sessão iFood expirou" | O refresh do token falhou | Faça login de novo |
| `502` "O MCP conectado não anunciou a ferramenta searchOffers." | Escopo insuficiente | Confira `IFOOD_SCOPES` e os escopos aprovados no portal |
| `502` "Os argumentos não correspondem ao schema anunciado de searchOffers." | O schema do MCP mudou | Compare `GET /mcp/tools` com a fixture e ajuste `ifood_mcp.py`/`build_refinements` |
| `502` "Não foi possível consultar tools/list no MCP do iFood." | Rede, gateway ou token inválido | Teste a rede; faça login de novo |
| Tudo parou depois de editar código | Reinício do processo apagou os tokens | Faça login de novo |

## Ambiente

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| `ModuleNotFoundError: agents` ou `PIL` | Dependências não instaladas ou venv inativa | Ative a `.venv` e rode `pip install -r requirements.txt` |
| `--env-file` ignorado | Rodando fora da pasta `backend` | Rode o uvicorn dentro de `backend/` |
| Erro com `BaseExceptionGroup` | Python anterior ao 3.11 | Use Python 3.11+ |
| `npm run build` falha | Erro de tipos (`tsc -b`) | Corrija os tipos indicados; confira `types.ts` contra `contracts.py` |
| Porta 5173 ou 8000 ocupada | Outro processo | Encerre o processo ou mude a porta (e o proxy/CORS/callback junto) |

## Como investigar

1. **Backend no ar?** `curl http://localhost:8000/health`
2. **Login ativo?** `curl http://localhost:8000/auth/status`
3. **MCP responde?** <http://localhost:8000/mcp/tools>
4. **Busca funciona sem o modelo?** `POST /mcp/test-search` com coordenadas
   reais.
5. **O agente funciona sem busca?** `POST /api/agent/message` com
   `"message": "Só quero ideias"` e um inventário.
6. **Log do backend:** falhas do `searchOffers` aparecem como
   `MCP searchOffers falhou (<TipoDaExceção>)`, sem dados sensíveis.

## Veja também

- [Referência da API](../03-backend/api-referencia.md)
- [Como rodar](como-rodar.md)
