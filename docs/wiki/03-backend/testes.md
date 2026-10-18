# Testes

Suíte com `unittest` da biblioteca padrão, em dois arquivos: **28 testes** no
total.

| Arquivo | Testes |
|---|---|
| [`backend/tests/test_agent.py`](../../../backend/tests/test_agent.py) | 21 |
| [`backend/tests/test_vision.py`](../../../backend/tests/test_vision.py) | 7 |

## Como rodar

```bash
cd backend
python -m unittest discover -s tests -v
```

Os testes **não** chamam a OpenAI nem o MCP: substituem o `Runner` do Agents SDK
e o transporte MCP por mocks e usam dados comerciais **sintéticos**. A rota de
API roda com `OPENAI_API_KEY=fake-offline-key`.

## O que é coberto

### `RulesTests` (9 testes): regras determinísticas

| Teste | Garante |
|---|---|
| `test_filters_are_schema_compatible_and_health_is_not_inferred` | Filtros válidos no schema real; alergia e diabetes não viram filtro; orçamento limita o preço por item |
| `test_consent_coordinates_and_money_validation` | Rejeita: dado sensível sem consentimento, latitude sem longitude, sessão sem `remember_context`, `NaN`, centavos não inteiros |
| `test_decimal_prices_promotion_and_zero_freight` | Conversão para centavos, preço promocional e frete zero |
| `test_text_json_inline_errors_and_empty_catalogue` | Payload em bloco de texto, erros inline e catálogo vazio |
| `test_hallucinated_ids_and_duplicate_selections_are_removed` | Referência inventada e seleção duplicada são descartadas |
| `test_costs_per_option_deduplicate_freight_and_never_claim_final_total` | Custo por opção, frete único por loja, status do orçamento |
| `test_confirmed_inventory_and_question_state` | `usa` restrito ao inventário; rebaixamento de estratégia; pergunta de tags só em `NOT_ASKED` |
| `test_recognized_context_is_unconfirmed_and_does_not_change_declared_budget` | `contexto_reconhecido` volta `INFERRED` e não confirmado, não altera o orçamento declarado e rejeita valores inválidos ou campos sensíveis |
| `test_sdk_strict_output_schema` | `AgentDraft` gera schema estrito (sem propriedades extras, todas obrigatórias) |

### `AgentTests` (5 testes): execução do agente

| Teste | Garante |
|---|---|
| `test_no_purchase_requires_no_ifood_token` | Sem busca, não pede token iFood |
| `test_tool_filters_evidence_and_no_token_or_coordinates_in_prompt` | Token e coordenadas fora do prompt; tracing desligado; `store=False`; só uma ferramenta; filtros repassados |
| `test_missing_location_does_not_call_mcp` | Sem localização, a ferramenta devolve `MISSING_LOCATION` sem chamar o MCP nem pedir token |
| `test_parallel_invocations_respect_three_searches_and_cache` | Cinco chamadas concorrentes: cache para termos iguais e no máximo 3 buscas |
| `test_auth_failure_is_not_empty_catalogue` | Falha de login vira `401`, não "catálogo vazio" |

### `APITests` (3 testes): rotas HTTP

| Teste | Garante |
|---|---|
| `test_session_remembers_tags_question_and_can_be_deleted` | Sessão guarda contexto e estado da pergunta; histórico de 4 turnos; `DELETE` funciona; sessão apagada responde `404` |
| `test_no_storage_by_default_and_sensitive_context_requires_consent` | `422` sem consentimento; nada é guardado por padrão |
| `test_failed_run_rolls_back_and_expired_session_is_rejected` | Falha do modelo responde `502` sem gravar; sessão expirada é rejeitada |

### `MCPTests` (1 teste)

| Teste | Garante |
|---|---|
| `test_real_schema_is_validated_before_tool_call` | Argumentos validados contra o schema real; filtro inventado bloqueia a chamada |

### `RegressionTests` (3 testes)

| Teste | Garante |
|---|---|
| `test_failed_search_cannot_be_rewritten_as_empty_catalogue` | O modelo não consegue transformar falha em "não há produtos" |
| `test_only_transport_failures_are_retried_once` | Um retry só para transporte; erro de schema não é repetido |
| `test_revocation_clears_sensitive_history_before_next_model_run` | Revogar o consentimento apaga o histórico antes da próxima execução |

### `test_vision.py` (7 testes): captura por foto

As imagens são geradas no próprio teste com Pillow (16 × 10 px), algumas com
metadados EXIF sintéticos.

| Classe · teste | Garante |
|---|---|
| `ImageValidationTests.test_supported_formats_are_decoded_and_metadata_removed` | JPEG, PNG e WebP são aceitos, e os metadados somem |
| `ImageValidationTests.test_invalid_mime_corrupt_data_mismatch_and_oversize_are_rejected` | MIME inválido, dado corrompido, formato trocado e excesso de tamanho são recusados |
| `ImageValidationTests.test_pixel_limit_and_animation_are_rejected_before_model` | Limite de megapixels e imagens animadas são barrados antes do modelo |
| `VisionTests.test_multimodal_request_has_no_tools_or_storage_and_cannot_confirm_quantity` | O agente de captura não tem ferramentas, não guarda dados e não consegue confirmar quantidade |
| `ImageAPITests.test_image_endpoint_returns_same_review_contract_without_mcp_or_session` | A rota devolve o mesmo contrato da revisão, sem MCP e sem sessão |
| `ImageAPITests.test_request_limits_and_generic_errors_never_echo_photo` | Limites do corpo e erros genéricos que nunca ecoam a foto |
| `ImageAPITests.test_timeout_and_provider_failure_preserve_retryable_error` | Timeout e falha do modelo viram `504` e `502` |

## Fixture do schema real

`tests/fixtures/search_offers_schema.json` é o `inputSchema` de `searchOffers`
coletado da sessão MCP autenticada em 17/10/2026, sem produtos, tokens ou dados
pessoais. Se o iFood mudar o schema, atualize a fixture com o resultado de
`GET /api/integration/tools`.

## Exportar contratos

```bash
cd backend
python scripts/export_contracts.py
```

Gera os JSON Schemas em `docs/contracts/`. Rode sempre que mudar
`contracts.py` e atualize `frontend/src/types.ts` em seguida.

## Frontend

Não há testes automatizados no frontend. A verificação é a checagem de tipos do
build:

```bash
cd frontend
npm run build   # tsc -b + vite build
```

## Veja também

- [Regras de negócio](regras-de-negocio.md)
- [Ciclo de execução do agente](../04-agente/ciclo-de-execucao.md)
