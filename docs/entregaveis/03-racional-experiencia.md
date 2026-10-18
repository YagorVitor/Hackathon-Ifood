# 03. Racional da experiência

## Começar com uma pergunta simples

A pessoa pode explicar o que quer resolver sem conhecer os nomes dos produtos. Texto, foto e ditado atendem a diferentes situações de uso. Uma foto facilita a entrada dos ingredientes; uma frase acrescenta a ocasião, como “quero um jantar rápido”.

A revisão vem logo depois. Ela permite corrigir o reconhecimento antes que um ingrediente errado influencie as sugestões ou a compra.

## Concentrar a participação nas decisões

O agente organiza as informações, propõe alternativas e realiza as buscas autorizadas. O usuário confirma o contexto, escolhe a opção e aprova o carrinho. A busca começa automaticamente quando a opção escolhida, a conexão e o destino estão prontos. A montagem gera primeiro uma proposta local; a confirmação seguinte é que cria o carrinho no iFood.

## Pedir preferências uma vez

“Meu perfil” reúne preferências e informações alimentares. A pessoa pode autorizar o uso, escolher lembrar no navegador ou apagar o perfil. Também pode seguir sem preenchê-lo.

Alergias, intolerâncias e condições de saúde só são enviadas com consentimento. O objetivo é reutilizar o que foi informado e evitar perguntas repetidas nas próximas recomendações. O perfil lembrado vale naquele navegador; conectar o iFood não importa preferências nem cria uma conta própria da CompletAI.

## Dar clareza à escolha

As sugestões explicam o que será aproveitado e o que falta. Os cards de compra mostram dados retornados pelo iFood, permitindo revisar produtos e quantidades antes de confirmar.

O endereço faz parte dessa decisão: ele orienta a disponibilidade das ofertas e precisa corresponder ao destino do carrinho.

## Adaptar a interface à pessoa

A aplicação oferece português e inglês, temas claro e escuro, ajuste de texto, contraste reforçado e redução de movimento. Há ditado, leitura em voz alta, indicação de foco e mensagens de status e erro.

O ditado depende do navegador e da permissão de microfone. Quando ele não está disponível, a pessoa pode continuar por texto ou foto. A acessibilidade ainda precisa ser validada com usuários e tecnologias assistivas; os recursos implementados não equivalem a uma certificação WCAG.

## Próximos ajustes

As prioridades de experiência são permitir um início sem ingredientes cadastrados, reduzir transições que não exigem uma decisão, completar a compra de acompanhamentos opcionais e observar onde as pessoas abandonam o fluxo. Esses pontos devem orientar os próximos testes com usuários.

## Referências no projeto

[Perfil](../../frontend/src/hooks/useUserProfile.ts), [acessibilidade](../../frontend/src/components/AccessibilityMenu.tsx) e [entrada por voz](../../frontend/src/components/VoiceInput.tsx).
