# 04 — Interface Visual

A interface é um **protótipo funcional** em React, integrado ao backend real
(sem dados simulados na aplicação). Código em [`frontend/`](../../frontend/).

## Telas

> **[PREENCHER]** Adicionar as capturas em `docs/entregaveis/img/` antes da
> submissão. Sugestão: rodar o cenário de exemplo do início ao fim e capturar
> cada etapa no celular (375 px) e no desktop.

### 1. Sua despensa
Texto livre com exemplo pronto, botões **Tirar foto** e **Enviar imagem**
(JPEG/PNG/WebP até 5 MB) com prévia e remoção.

![Sua despensa](img/01-despensa.png)

### 2. Revisão
Ingredientes reconhecidos em cards editáveis (nome, quantidade, unidade), todos
marcados como *Sugerido pela IA*. Seções expansíveis para objetivo, pessoas,
tempo, orçamento e preferências. Consentimento separado para dados sensíveis.

![Revisão](img/02-revisao.png)

### 3. Sugestões do agente
Cards por estratégia: *aproveitar o que tenho*, *complementar* e *conveniência*,
com ingredientes usados, faltantes e justificativa sob demanda.

![Sugestões](img/03-sugestoes.png)

### 4. Só o que falta
Conexão com a conta iFood e localização (GPS ou digitada). Produtos reais do
iFood Mercado por faltante, com loja, preço observado, frete, pedido mínimo,
etiqueta *Dado do iFood (MCP)* e aviso de limitações.

![Só o que falta](img/04-faltantes.png)

### 5. Conclusão
Resumo da escolha. Explica que nenhum carrinho foi criado nem pedido feito.

![Conclusão](img/05-conclusao.png)

## Como rodar

```bash
# Backend (ver backend/README.md para o .env)
cd backend
uvicorn app.main:app --env-file .env --host 127.0.0.1 --port 8000 --no-access-log

# Frontend
cd frontend
npm install
npm run dev   # http://localhost:5173
```

## Componentes de destaque

| Componente | Arquivo | Papel |
|---|---|---|
| Captura | `frontend/src/steps/CaptureStep.tsx`, `components/PhotoInput.tsx` | Texto, câmera ao vivo e upload |
| Revisão | `frontend/src/steps/ReviewStep.tsx` | Edição de ingredientes e contexto |
| Perfil | `frontend/src/steps/TagsStep.tsx` | Preferências e dados sensíveis com consentimento |
| Sugestões | `frontend/src/steps/OptionsStep.tsx` | Cards das estratégias |
| Mercado | `frontend/src/steps/MarketStep.tsx` | OAuth, localização e produtos do MCP |

## Limitações conhecidas da interface

- **Foto não funciona ponta a ponta:** o frontend chama
  `POST /api/context/parse-image`, que ainda não existe no backend. Até ser
  implementado, a demonstração deve usar o caminho por texto.
- Não há tela de carrinho nem de pedido (ver
  [05 — Documento Técnico](05-documento-tecnico.md)).
