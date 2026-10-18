# Conexão com a conta iFood

## Experiência implementada

Na entrada, a pessoa pode conectar a conta antes de informar ingredientes. A ação
também fica no cabeçalho. Continua sendo possível planejar uma refeição sem login:
o OAuth é necessário quando há consulta ao Mercado. Isso preserva a estratégia de
aproveitamento sem compra de `HACKATHON_CONTEXT.md`.

O login usa a rota existente `/auth/login`, abre outra aba e preserva o rascunho em
memória. O frontend verifica `/auth/status` ao voltar a qualquer etapa. Durante um
login iniciado pela pessoa, verifica a conexão a cada três segundos com a página
visível, por até cinco minutos; depois pode verificar manualmente ou reiniciar.
Essas verificações não acionam ferramentas MCP nem buscas de produtos.

O backend mantém o OAuth com PKCE S256 e valida `state`; a troca de código e a
renovação continuam no servidor. `/auth/status` agora passa pelo controle de
validade/renovação, em vez de considerar suficiente a presença de tokens na memória.
O status e a confirmação não devem ser armazenados em cache. O callback orienta
a voltar ao app e não aponta mais para o diagnóstico técnico de ferramentas.

## Pesquisa na documentação oficial

Guias consultados autenticado no portal em 17/10/2026:

- [Jornadas](https://mcp-developer.ifood.com.br/pt-BR/docs/guides/authentication/jornadas):
  Login Web em `https://id.ifood.com.br/authorize`; telefone/e-mail e desafios
  são tratados pelo iFood. Any2App usa `https://app.ifood.com.br/F4X4/authorize`
  no contexto mobile com fallback Web. A interface Web atual mantém a jornada universal.
- [Implementação](https://mcp-developer.ifood.com.br/pt-BR/docs/guides/authentication/implementacao):
  PKCE, validação de state, callback exato, troca pelo backend e renovação com
  margem de cinco minutos. Logout deve revogar os tokens; esta alteração não
  introduz um botão de logout nem implementa revogação.
- [Escopos](https://mcp-developer.ifood.com.br/pt-BR/docs/guides/authentication/escopos):
  só solicitar os escopos técnicos liberados ao agente. Esta alteração não amplia
  `IFOOD_SCOPES`; mantém o escopo de busca já validado na integração.
- [User MCP — Tools](https://mcp-developer.ifood.com.br/pt-BR/docs/guides/mcps/account/tools):
  documenta `getUser`, `listAddresses` e `createAddress`. São capacidades de outro
  domínio, com permissões próprias. Existirem nos guias não comprova que estejam
  disponíveis no endpoint/token usado pela implementação atual.

## Evolução possível, ainda não implementada

Para saudar pelo nome ou utilizar endereços salvos, conferir primeiro os escopos
homologados no portal e o `tools/list` real do User MCP. Validar os schemas,
solicitar apenas as permissões necessárias e só então integrar as leituras.
Não ampliar automaticamente para dados avançados, comportamento ou escrita de endereços.
O MCP de descoberta já validado no projeto não comprova acesso a essas operações.

Preferências, alergias e saúde continuam declaradas no produto. Um perfil
comportamental do iFood não equivale ao consentimento ou à confirmação desses dados.

## Limite do MVP

O backend atual continua sendo um teste local de **um único usuário**, com tokens
em memória da instância. Antecipar o login não implementa cadastro persistente,
isolamento de contas por navegador nem autenticação multiusuário de produção.
Antes de hospedar para várias pessoas, separar sessões e tokens por usuário com
cookie HttpOnly, vincular tentativas OAuth à sessão e implementar expiração/logout.
Não compartilhar esta instância como serviço multiusuário.

## Validação

Testes de API cobrem: ausência de sessão sem refresh, verificação de validade sem
expor tokens, expiração, falhas do serviço, callback sem refletir parâmetros e
callback incompleto/recusado sem trocar códigos. O login real ainda depende do
consentimento na conta iFood e das credenciais configuradas no ambiente.
