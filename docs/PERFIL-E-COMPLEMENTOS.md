# Perfil reutilizável e complementos opcionais

Refinamento solicitado pela equipe em 18/10/2026, sobre a develop.

## Experiência

- Meu perfil fica disponível no cabeçalho em qualquer etapa; o formulário de
  preferências foi removido da revisão dos ingredientes. As sugestões não repetem
  chips de perfil; o agente recebe o contexto automaticamente em cada consulta.
- O perfil contém preferências, alergias, intolerâncias e condições de saúde
  declaradas. Dados sensíveis só são usados com consentimento explícito.
- Lembrar meu perfil neste navegador é uma escolha separada, desmarcada por
  padrão. Sem ela, o perfil dura na aba; com ela, fica no localStorage versionado.
  Não inclui tokens OAuth, endereço, chave OpenAI, inventário ou carrinhos.
- A persistência é local ao navegador e não é uma conta autenticada do produto,
  nem um perfil de saúde fornecido ou armazenado pelo iFood. Quem compartilha o
  navegador pode acessar esse perfil. Não há sincronização entre dispositivos.
- Revogar consentimento remove os campos sensíveis do próximo contexto e da
  versão salva. Apagar meu perfil remove a persistência. Erros de armazenamento
  são exibidos; o app não afirma que salvou quando a escrita falha.
- Alterar/apagar o perfil descarta recomendações, buscas e produtos preparados
  para carrinho. Uma nova consulta usa o perfil atualizado, sem histórico no backend.

## Complementos

- A saída estruturada da IA exige de 1 a 3 complementos_opcionais em cada opção,
  inclusive USE_WHAT_I_HAVE com todos os ingredientes disponíveis. Cada complemento
  tem nome genérico e justificativa, com origem INFERRED.
- A validação determinística remove duplicatas, itens já confirmados no inventário
  e nomes com alérgenos explicitamente declarados. Isso não comprova composição,
  ausência de alérgenos ou adequação clínica; o catálogo continua exigindo conferência.
- Complementos não entram nos faltantes da refeição e não disparam busca ou compra.
  A pessoa escolhe buscar o complemento; a partir daí é uma intenção de compra
  opcional, com localização, perfil, catálogo real e confirmação de carrinho existentes.
- Depois de escolher uma refeição completa, a tela continua dizendo que nenhuma
  compra é necessária, mas oferece os complementos opcionais no iFood.
- Se todos os complementos forem descartados ou a resposta vier de um backend
  antigo, a interface oferece pedir uma sugestão contextual, sem inventar produto.
- Preferências e restrições também orientam os complementos; diabetes não cria
  filtro de açúcar automaticamente. Nada de diagnóstico ou promessa clínica.

## Verificação local

- Build TypeScript/Vite.
- 40 testes unitários selecionados do backend, incluindo novo contrato, complemento
  separado dos faltantes, exclusão de item disponível e alérgeno declarado.
- 7 testes de perfil/interface: persistência opcional, reutilização entre pedidos,
  revogação, exclusão, dados inválidos, falha de escrita e complemento com refeição completa.
- A suíte completa com rotas não terminou no sandbox; não foi declarada aprovada.
- Não houve consulta paga à IA nem operação comercial real para validar esta feature.
