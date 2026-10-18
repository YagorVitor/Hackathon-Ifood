# 04. Interface visual

A interface da CompletAI está implementada em React, no diretório `frontend` da branch `main`. Ela reúne a entrada do contexto, as sugestões e a revisão do carrinho em uma jornada por etapas.

## Telas da aplicação

| Tela | O que a pessoa faz |
|---|---|
| Entrada | Explica a ocasião por texto, ditado, câmera ou envio de imagem. |
| Revisão | Confere e corrige os ingredientes e as informações reconhecidas. |
| Meu perfil | Informa preferências, autoriza dados sensíveis e escolhe se quer lembrar no navegador. |
| Sugestões | Compara alternativas, ingredientes necessários e acompanhamentos opcionais. |
| Ofertas iFood | Conecta a conta, escolhe o destino e consulta os produtos encontrados. |
| Carrinho | Escolhe a loja, ajusta quantidades, revisa a proposta e confirma a criação. Depois vê se os itens foram conferidos. |
| Preparo sem compra | Consulta o resumo da sugestão que aproveita o que já tem. |
| Acessibilidade | Ajusta idioma, aparência, texto, contraste e movimento. |

## Direção visual

A identidade CompletAI usa vermelho, cards e títulos com hierarquia clara. As ações principais recebem destaque, enquanto a navegação por etapas mostra o avanço da jornada. Tema, contraste e tamanho de texto permitem adaptar a leitura.

## Demonstração sugerida

1. Enviar uma foto real acompanhada de um objetivo curto.
2. Conferir os ingredientes identificados e corrigir o que for necessário.
3. Mostrar como o perfil entra nas recomendações.
4. Escolher uma opção com itens para comprar.
5. Selecionar o endereço e mostrar ofertas retornadas pelo iFood.
6. Revisar a proposta, confirmar o carrinho e apresentar o estado retornado pela conferência.

Prepare um exemplo com pelo menos um alimento reconhecível: a revisão atual exige um ingrediente para continuar. A demonstração de restaurantes deve partir de uma opção de conveniência apresentada pelo agente. Não há uma entrada independente de pedido sem ingredientes nesta interface.

As marcações sobre a foto usada no pitch são ilustrativas. A aplicação reconhece itens para revisão, mas não implementa essas caixas sobre a imagem.

## Acesso para avaliação

Os comandos de instalação, configuração e execução estão no [README da main](../../README.md). O frontend usa o Vite e encaminha as chamadas ao backend na porta 8000.

Para avaliação fora do computador de demonstração, é necessário anexar capturas, um vídeo ou um link publicado. O endereço localhost não dá acesso remoto. Este documento acompanha a interface do repositório; não substitui sua demonstração visual.

## Localização no código

As telas ficam em `frontend/src/steps`. Câmera, ditado, seleção de endereço e acessibilidade ficam em `frontend/src/components`. O perfil é controlado por `frontend/src/hooks/useUserProfile.ts`, e os estilos estão em `frontend/src/index.css`.

## Referências no projeto

[Telas implementadas](../../frontend/src/steps), [componentes](../../frontend/src/components) e [estilos](../../frontend/src/index.css).
