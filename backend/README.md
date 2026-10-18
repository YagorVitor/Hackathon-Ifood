# Backend da CompletAI

FastAPI, Pydantic, OpenAI Agents SDK e MCP oficial do iFood.

- [Instalação, configuração e execução](../README.md#configurar-o-backend)
- [Arquitetura e estado](../docs/arquitetura.md)
- [Agente e análise de imagem](../docs/agente.md)
- [OAuth e integração MCP](../docs/integracao-ifood.md)
- [Rotas da API](../docs/api.md)
- [Contratos exportados](../docs/contracts/README.md)

Os testes ficam em `tests`. Com o ambiente virtual ativo, execute nesta pasta:

```bash
python -m unittest discover -s tests -q
```
