# Front-end — Despensa Reversa (mobile, protótipo)

React + Vite + TypeScript + Tailwind. Mobile-first (largura máx. ~448px).

```
npm install
npm run dev   # http://localhost:5173
```

Todos os dados vêm de `src/mock.ts` e aparecem na UI como **Simulado**. Para integrar,
substitua as funções de `mock.ts` por chamadas à API do backend (`docs/PLANO-BACKEND.md` §9);
`/api` e `/auth` já têm proxy para `:8000` em `vite.config.ts`.
