# Frontend

Aplicação **React + Vite + TypeScript + Tailwind CSS v4**, em pt-BR e
responsiva. Código em [`frontend/`](../../../frontend/).

Não há dados simulados: tudo vem do backend por `POST /api/agent/message`.
Nenhuma credencial fica no navegador.

## Stack

| Pacote | Versão | Papel |
|---|---|---|
| `react`, `react-dom` | `^18.3.1` | UI |
| `vite` | `^5.4.0` | Dev server e build |
| `@vitejs/plugin-react` | `^4.3.1` | JSX e Fast Refresh |
| `typescript` | `^5.5.3` | Tipos (`tsc -b` no build) |
| `tailwindcss`, `@tailwindcss/vite` | `^4.0.0` | Estilo utilitário |

Não há bibliotecas de estado, roteamento, ícones ou componentes. Os ícones são
SVG inline (`components/icons.tsx`), e a fonte Inter vem do Google Fonts, com
fallback para fontes do sistema.

## Estrutura

```
frontend/
├── index.html                 HTML base (lang pt-BR, meta, fonte Inter)
├── vite.config.ts             plugins e proxy para o backend
├── package.json
├── tsconfig.json
└── src/
    ├── main.tsx               ponto de entrada (StrictMode)
    ├── App.tsx                estado global e máquina de etapas
    ├── api.ts                 cliente HTTP e mapeamento de erros
    ├── flow.ts                regras do cliente: validação e montagem do contexto
    ├── types.ts               espelho dos contratos do backend
    ├── index.css              tokens de design e estilos de layout
    ├── components/
    │   ├── ui.tsx             Button, Card, Badge, Chip, Notice, Loading…
    │   ├── icons.tsx          ícones SVG inline
    │   ├── PhotoInput.tsx     câmera, upload e prévia
    │   └── PantryIllustration.tsx   ilustração da tela inicial
    └── steps/
        ├── CaptureStep.tsx    1. Sua despensa
        ├── ReviewStep.tsx     revisão dos ingredientes e do pedido
        ├── TagsStep.tsx       preferências e restrições
        ├── OptionsStep.tsx    2. Sugestões do agente
        ├── MarketStep.tsx     3. Só o que falta
        └── DoneStep.tsx       fim sem compra
```

## Executar

```bash
cd frontend
npm install
npm run dev       # http://localhost:5173
npm run build     # tsc -b && vite build
npm run preview   # serve o build
```

O backend precisa estar em `http://localhost:8000`.

## Proxy

`vite.config.ts` redireciona para o backend:

| Prefixo | Destino |
|---|---|
| `/api` | `http://localhost:8000` |
| `/auth` | `http://localhost:8000` |
| `/health` | `http://localhost:8000` |

Assim, o navegador fala só com a origem do Vite, sem CORS. A exceção é o
callback do OAuth, que o iFood manda direto para `localhost:8000/auth/callback`.

## Princípios

- **Stateless no servidor:** toda chamada manda `remember_context=false` e o
  contexto completo.
- **Perfil só na aba:** nada em `localStorage` ou cookies.
- **Procedência sempre visível:** cada dado mostra de onde veio.
- **Sem dados sensíveis sem consentimento:** `buildContext` esvazia as listas
  sensíveis sem autorização.

## Páginas desta seção

| Página | Conteúdo |
|---|---|
| [Fluxo de telas](fluxo-de-telas.md) | Etapas, transições e mensagens enviadas ao agente |
| [Estado e integração](estado-e-integracao.md) | Estado do `App`, `api.ts`, `flow.ts`, erros |
| [Componentes](componentes.md) | Etapas e componentes reutilizáveis |
| [Design e acessibilidade](design-e-acessibilidade.md) | Tokens, procedência e a11y |
