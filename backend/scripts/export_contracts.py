"""Exporta contratos da API e da fronteira backend/agente, sem credenciais."""
import json
import sys
from pathlib import Path

backend = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(backend))
from app.contracts import AgentEnvelope, AgentOutput, AgentRequest, AgentResponse

output = backend.parent / 'docs' / 'contracts'
output.mkdir(parents=True, exist_ok=True)
for name, model in (
    ('agent-request', AgentRequest), ('agent-response', AgentResponse),
    ('agent-envelope', AgentEnvelope), ('agent-output', AgentOutput),
):
    (output / f'{name}.schema.json').write_text(
        json.dumps(model.model_json_schema(), ensure_ascii=False, indent=2) + '\n'
    )
print('Contratos exportados em docs/contracts/.')
