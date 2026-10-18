# Frontend, perfil e acessibilidade

React, TypeScript, Vite e Tailwind CSS formam a interface. A execução e o build estão no [README principal](../README.md). O Vite encaminha `/api`, `/auth` e `/health` para o backend na porta 8000.

## Jornada

| Etapa | Responsabilidade |
|---|---|
| `capture` | Texto, ditado, câmera ou upload |
| `review` | Conferência de ingredientes e contexto reconhecidos |
| `tags` | Perfil opcional e consentimento |
| `options` | Sugestões, ingredientes faltantes e complementos |
| `market` | Conexão, endereço e ofertas iFood |
| `cart` | Revisão, confirmação e resultado do carrinho |
| `done` | Opção que pode ser preparada sem compra |

O estado principal fica em `src/App.tsx`. As etapas ficam em `src/steps`, e os componentes compartilhados em `src/components`. A API é acessada por `src/api.ts`; o contexto é montado por `src/flow.ts`.

O login pode ser iniciado desde a entrada. A aplicação preserva o contexto ao abrir a autorização em outra aba. A troca de `connection_id` invalida resultados anteriores. Trocar o endereço exige nova busca. Durante a confirmação do carrinho, a navegação que poderia invalidar a operação fica bloqueada.

Complementos opcionais aparecem nas sugestões. O caminho dedicado para comprá-los em uma opção sem faltantes ainda não está concluído. A tela `done` encerra com a orientação de preparo.

## Perfil

`useUserProfile.ts` centraliza preferências, alergias, intolerâncias e condições de saúde. Lembrar no navegador é opcional e desmarcado por padrão. Quando escolhido, salva um perfil versionado em localStorage, sem endereço, inventário, carrinho ou tokens.

Sem consentimento, dados sensíveis não são enviados. Revogar consentimento remove os campos sensíveis da versão salva e do próximo contexto. Apagar o perfil remove a persistência. Falhas de armazenamento são informadas. O perfil pertence à CompletAI e não é sincronizado com o iFood ou outros dispositivos.

## Câmera e upload

A câmera usa `getUserMedia` quando disponível, com permissão e contexto seguro. Há alternativa pelo seletor nativo. A captura gera JPEG; upload aceita JPEG, PNG e WebP até 5 MB. A imagem tem prévia e pode ser removida antes do envio.

A câmera é encerrada ao sair do componente e as URLs de prévia são revogadas. A foto é enviada à OpenAI pelo backend para reconhecimento; os itens retornados passam por revisão.

## Acessibilidade

O cabeçalho oferece português e inglês, tema claro, escuro ou do sistema, texto ampliado, contraste reforçado e redução de movimento. As preferências ficam separadas do perfil alimentar. Nomes comerciais e valores em reais são preservados; respostas anteriores mantêm o idioma em que foram geradas.

O ditado usa `SpeechRecognition` ou `webkitSpeechRecognition`, conforme o navegador. Só resultados finais são incorporados, com limite de 4.000 caracteres e parada após 60 segundos. O navegador pode encaminhar áudio ao serviço de reconhecimento; o backend recebe apenas o texto enviado para análise.

A leitura usa `SpeechSynthesis`, acionada pelo usuário e sem reprodução automática. Texto e foto continuam disponíveis quando não há suporte à voz. Não se trata de uma conversa de áudio em tempo real.

A interface inclui foco visível, link para pular ao conteúdo, indicação da etapa atual e mensagens de erro. Os testes cobrem aspectos de contraste, perfil e ciclo de vida. Leitores de tela, microfone, vozes e zoom precisam de validação em dispositivos reais antes de declarar cobertura completa de acessibilidade.
