"""Estado do backend para o protótipo local de um único usuário; agente stateless."""

import asyncio
import secrets
import time
from collections import OrderedDict
from dataclasses import dataclass, field

from fastapi import HTTPException

from .contracts import (
    AgentEnvelope,
    AgentOutput,
    AgentRequest,
    HistoryTurn,
    Location,
    UserContext,
)


@dataclass
class Conversation:
    context: UserContext = field(default_factory=UserContext)
    history: list[HistoryTurn] = field(default_factory=list)
    expires_at: float = 0


class ConversationStore:
    def __init__(self, ttl_seconds: int = 1800, max_sessions: int = 100):
        self.ttl_seconds = ttl_seconds
        self.max_sessions = max_sessions
        self._sessions: OrderedDict[str, Conversation] = OrderedDict()
        # Serializa as conversas locais e evita perder atualizações concorrentes.
        self.lock = asyncio.Lock()

    def prepare(self, payload: AgentRequest) -> tuple[str | None, AgentEnvelope]:
        now = time.monotonic()
        for key in list(self._sessions):
            if self._sessions[key].expires_at <= now:
                del self._sessions[key]
        conversation = self._sessions.get(payload.session_id) if payload.session_id else None
        if payload.session_id and conversation is None:
            raise HTTPException(404, "Sessão inexistente ou expirada; inicie outra conversa.")
        context = (
            payload.context or (conversation.context if conversation else UserContext())
        ).model_copy(deep=True)
        if payload.latitude is not None:
            context.localizacao = Location(latitude=payload.latitude, longitude=payload.longitude)
        history = conversation.history[:] if conversation else []
        if (
            conversation
            and conversation.context.consentimento_dados_sensiveis
            and not context.consentimento_dados_sensiveis
        ):
            # Revogação também remove o histórico que pode conter restrições antigas.
            # A exclusão não depende de a próxima chamada ao modelo funcionar.
            conversation.history.clear()
            conversation.context = context.model_copy(deep=True)
            history = []
        envelope = AgentEnvelope(
            mensagem_usuario=payload.message,
            contexto=context,
            historico_resumido=history,
        )
        session_id = (
            (payload.session_id or secrets.token_urlsafe(24)) if payload.remember_context else None
        )
        return session_id, envelope

    def commit(self, session_id: str | None, envelope: AgentEnvelope, output: AgentOutput):
        if session_id is None:
            return
        context = envelope.contexto.model_copy(deep=True)
        tags = context.tags_declaradas
        if output.pergunta_tags and tags.estado == "NOT_ASKED":
            tags.estado = "ASKED"
        # Não conserva preços/IDs antigos como evidência para a próxima execução.
        history = envelope.historico_resumido + [
            HistoryTurn(papel="usuario", texto=envelope.mensagem_usuario),
            HistoryTurn(
                papel="agente",
                texto=output.model_dump_json(exclude={"produtos", "custos", "buscas"}),
            ),
        ]
        self._sessions[session_id] = Conversation(
            context, history[-12:], time.monotonic() + self.ttl_seconds
        )
        self._sessions.move_to_end(session_id)
        while len(self._sessions) > self.max_sessions:
            self._sessions.popitem(last=False)

    def delete(self, session_id: str):
        if self._sessions.pop(session_id, None) is None:
            raise HTTPException(404, "Sessão inexistente.")
