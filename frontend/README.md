# Front-end — Despensa Reversa

React + Vite + TypeScript + Tailwind v4. Responsivo, pt-BR, tema claro com vermelho de destaque e hierarquia visual inspirada no iFood.
Sem dados simulados na aplicação: tudo vem do backend deste repositório por `POST /api/agent/message`.

## Rodar

1. Backend (pasta `backend/` neste checkout), conforme `backend/README.md`:

   ```bash
   uvicorn app.main:app --env-file .env --host 127.0.0.1 --port 8000 --no-access-log
   ```

2. Frontend:

   ```bash
   npm install
   npm run dev   # http://localhost:5173
   ```

O Vite faz proxy de `/api`, `/auth` e `/health` para `localhost:8000`. Nenhuma credencial fica no
frontend: OAuth do iFood e chave da OpenAI vivem só no backend.

## Fluxo (docs/HACKATHON_CONTEXT.md §4 e §10)

A tela inicial oferece `Conectar conta iFood`, também disponível no cabeçalho.
É opcional para organizar a despensa e obter ideias; a conexão só é exigida para
consultar o Mercado. O login abre outra aba e preserva texto, foto e revisão.
Ao retornar a qualquer etapa, o app consulta `/auth/status` novamente. Enquanto
um login solicitado estiver pendente, verifica o status a cada três segundos
com a aba visível, por até cinco minutos. Há também verificação manual.
O callback confirma a conexão e orienta a voltar ao app, sem mostrar ferramentas técnicas.
Isso não cria um cadastro próprio nem importa perfil, restrições ou endereços.
Veja [AUTENTICACAO-IFOOD.md](../docs/AUTENTICACAO-IFOOD.md).

1. **Sua despensa** — texto livre, foto pela câmera ou upload (JPEG/PNG/WebP, até 5 MB). A foto tem prévia e pode ser removida antes do envio. O agente extrai ingredientes e `contexto_reconhecido`
   (objetivo, pessoas, tempo e orçamento explicitamente mencionados), todos ainda `INFERRED`.
   A pessoa confere uma revisão compacta; nomes e quantidades podem ser corrigidos.
   Objetivo e preferências podem ser ajustados em seções expansíveis na mesma tela.
   Preferências são opcionais; alergias, intolerâncias e saúde exigem consentimento.
   Ao confirmar, o frontend envia inventário e contexto completos. Não há uma etapa obrigatória de perfil.
2. **Sugestões do agente** — cards para aproveitar o que tem, complementar ou buscar conveniência,
   conforme as opções efetivamente retornadas. Explicações extensas ficam sob demanda.
3. **Só o que falta** — escolher uma refeição com faltantes autoriza sua busca. Se necessário,
   a pessoa conecta a conta iFood e escolhe uma localização. Quando ambas estão disponíveis,
   a busca começa automaticamente uma vez, sem outro botão de confirmação. Erros exigem
   repetição explícita; não há repetição automática infinita. Se não faltar nada, a opção termina
   no caminho sem compra. Não há carrinho nem pedido.

O frontend tolera backends anteriores sem `contexto_reconhecido`; nesse caso os campos ficam
em branco para revisão. Para extrair os detalhes automaticamente, execute também o backend
atualizado deste checkout. `contexto_reconhecido` não altera orçamento nem filtros até confirmação.

Etiquetas de procedência: **Você informou**, **Sugerido pela IA**, **Dado do iFood (MCP)**, **Estimativa**.

Cada chamada é stateless (`remember_context=false`): o frontend reenvia o contexto completo e o backend
não guarda a conversa. Perfil e dados sensíveis ficam só na memória da aba (sem `localStorage`).

## Verificação

```bash
npm run build   # tsc -b + vite build
```


## Câmera e imagens

- `Tirar foto` abre uma câmera com prévia ao vivo, preferindo a traseira no celular.
  É necessário autorizar a câmera no navegador; localhost ou HTTPS é exigido.
  Onde a API de câmera não está disponível, o seletor nativo permite fotografar/enviar.
- `Enviar imagem` aceita uma foto estática JPEG, PNG ou WebP de até 5 MB.
  HEIC não é aceito neste MVP. A câmera captura JPEG com lado máximo de 2048 px.
- A foto só sai do navegador ao clicar em `Descobrir o que preparar`, com aviso de
  envio à OpenAI. Texto complementar é opcional, inclusive objetivo e orçamento.
- `POST /api/context/parse-image` recebe JSON `{ image_data_url, message }` e devolve
  o mesmo `AgentResponse` usado na revisão. O backend valida o arquivo, limita a
  20 megapixels, corrige orientação, remove metadados e reduz o lado para 2048 px.
- Imagens são processadas em memória, sem upload público, gravação em disco ou
  armazenamento em sessão. A câmera é desligada ao fechar, capturar, sair da aba
  ou desmontar o componente; URLs de prévia são revogadas.
- O reconhecimento não tem ferramentas MCP e não gera uma compra: devolve hipóteses
  para revisão. Quantidade/unidade da imagem são removidas pelo backend. O planejamento
  posterior usa apenas os ingredientes confirmados, sem reenviar a foto.
