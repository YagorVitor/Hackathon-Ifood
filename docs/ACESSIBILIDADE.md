# Acessibilidade e apresentação

A experiência mantém o fluxo de `HACKATHON_CONTEXT.md`: contar a despensa, revisar, escolher uma sugestão e consultar o iFood quando fizer sentido. Entrada por voz complementa texto e foto; não autoriza buscas, criação de carrinho ou pedidos.

## Controles no cabeçalho

- Português e inglês: interface e idioma solicitado para novas respostas do agente, inclusive reconhecimento de fotos. Respostas anteriores não são regeneradas. Nomes de produtos, lojas, endereços, IDs, enums e valores em reais permanecem como recebidos. Mensagens técnicas desconhecidas do backend/MCP podem permanecer no idioma original.
- Tema claro, escuro ou seguindo o sistema. O tema inicial é aplicado antes da montagem do React para reduzir a troca de cores no carregamento.
- Texto padrão, grande e extra grande; contraste reforçado; redução de movimento. A preferência de movimento do sistema também é respeitada.
- Ajustes salvos separadamente no navegador, sem dados alimentares, saúde, OAuth ou áudio. Se o armazenamento falhar, valem para a aba e o painel avisa. As alterações acompanham outras abas da mesma origem.

O painel usa controles nativos com rótulos. Escape fecha e devolve o foco ao acionador; sair pelo teclado ou clicar fora fecha o painel. O conteúdo e os formulários continuam disponíveis sem voz.

## Voz

**Ditar meu pedido** é acionado pela pessoa. Usa `SpeechRecognition` ou `webkitSpeechRecognition` quando disponível. O navegador pode pedir permissão e encaminhar áudio ao seu serviço de reconhecimento; o aviso aparece antes do uso. O backend não recebe arquivos de áudio nesta implementação: recebe o texto revisado, quando a pessoa pede análise.

Somente resultados finais são anexados, sem repetir trechos de eventos cumulativos. Limite de 4.000 caracteres e parada após 60 segundos. Enquanto o ditado está ativo, a análise e os outros métodos de entrada ficam desabilitados para evitar perda de texto. Trocar idioma, sair da tela ou ocultar a aba encerra o reconhecimento. Negação, ausência de fala e indisponibilidade mantêm a alternativa em texto.

**Ouvir resposta** lê mensagens e sugestões com `SpeechSynthesis`, sem reprodução automática. Há parada explícita, leitura em trechos e cancelamento ao sair da tela, trocar idioma/texto, iniciar outra leitura ou ocultar a aba. Vozes disponíveis dependem do navegador/sistema. A implementação não é uma conversa de áudio em tempo real.

Referências: [SpeechRecognition (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition), [SpeechSynthesis (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis).

## Teclado, contraste e telas pequenas

Link de pular ao conteúdo, foco visível reforçado, foco no título ao mudar de etapa, progresso com `aria-current`, avisos de processamento e erros associados aos campos. Não depender somente de cor para procedência e estados. Controles principais e resumos expansíveis têm área mínima de 44 pixels. Textos auxiliares antes menores que 12 pixels foram ampliados; o tamanho acompanha a raiz em `rem`.

Paletas semânticas próprias para tema escuro e contraste reforçado. A grade de ingredientes vira uma coluna nas telas estreitas; ações deixam de ser fixas no rodapé móvel para não cobrir o conteúdo. A ilustração decorativa sai em telas estreitas para priorizar leitura. Não há certificação WCAG implícita.

## Verificação

Automatizada: `npm run build`, `npm run test:accessibility`, `npm run test:profile`; backend `test_language` e regressões do agente/carrinho/imagem. Inclui idiomas, armazenamento indisponível/corrompido, transcrições cumulativas, limites da fala, alternativa sem APIs de voz e contraste mínimo 4,5:1 dos pares principais de texto nos dois temas base.

Navegador: troca de idioma, escuro/contraste/texto ampliado, persistência após recarregar, Escape devolvendo foco e tela estreita de 390 pixels sem rolagem horizontal no início do fluxo. Microfone real, vozes reais, leitores de tela (NVDA/VoiceOver), zoom de 200–400% em todas as etapas e Safari/Firefox/Chrome devem ser validados em dispositivos reais antes de declarar cobertura completa. Não foi enviada gravação de microfone durante os testes automatizados.
