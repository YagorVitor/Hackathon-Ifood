# Documentação da CompletAI

Para instalar, configurar as credenciais e iniciar o projeto, use o [README principal](../README.md).

## Implementação

| Guia | Conteúdo |
|---|---|
| [Arquitetura](arquitetura.md) | Módulos, estado, consentimento, testes e limites da versão |
| [Agente e imagem](agente.md) | OpenAI Agents SDK, recomendações, busca e reconhecimento de alimentos |
| [Integração iFood](integracao-ifood.md) | OAuth, ferramentas MCP, endereço e carrinho |
| [Frontend](frontend.md) | Etapas, perfil, câmera, voz e acessibilidade |
| [API](api.md) | Rotas e contratos de entrada e saída |
| [JSON Schemas](contracts/README.md) | Formatos gerados pelo backend |

## Produto e avaliação

- [Contexto do hackathon](HACKATHON_CONTEXT.md): referência original de produto e orientações dos mentores. Preservada como registro das decisões iniciais; o estado implementado está nos guias acima.
- [Entregáveis](entregaveis/README.md): os seis documentos preparados para a banca.
- [Pitch atual](pitch/README.md): apresentação HTML com oito slides, notas e atalhos.
- [Apresentações anteriores](apresentacao/README.md): PowerPoint e roteiro preservados como histórico.

## Como manter

Atualize o guia do assunto quando o comportamento mudar. Comandos de instalação ficam no README principal; detalhes de código ficam nos guias técnicos; o texto para a banca fica nos entregáveis. Relatos de bugs resolvidos e planos substituídos ficam no histórico do Git, sem uma página permanente para cada correção.

Ao mudar um contrato, exporte novamente os schemas e confira os tipos do frontend. Revise os links relativos depois de mover um documento. Descreva recursos disponíveis separadamente de propostas futuras.
