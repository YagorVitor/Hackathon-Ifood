"""OAuth 2.1 + PKCE do iFood para execução local de um único usuário."""

import asyncio
import base64
import hashlib
import secrets
import time
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlencode

import httpx2
from fastapi import HTTPException

from .settings import Settings

AUTHORIZE_URL = "https://id.ifood.com.br/authorize"
TOKEN_URL = "https://id.ifood.com.br/token"
ATTEMPT_TTL_SECONDS = 600


@dataclass
class OAuthAttempt:
    verifier: str
    expires_at: float


@dataclass
class TokenSet:
    access_token: str
    refresh_token: str
    expires_at: float


class IfoodOAuth:
    def __init__(self) -> None:
        self._attempts: dict[str, OAuthAttempt] = {}
        self.tokens: TokenSet | None = None
        self._refresh_lock = asyncio.Lock()

    def authorization_url(self, settings: Settings) -> str:
        settings.validate_oauth()
        verifier = secrets.token_urlsafe(48)
        challenge = base64.urlsafe_b64encode(
            hashlib.sha256(verifier.encode("ascii")).digest()
        ).rstrip(b"=").decode("ascii")
        state = secrets.token_urlsafe(24)
        now = time.monotonic()
        self._attempts = {
            key: attempt
            for key, attempt in self._attempts.items()
            if attempt.expires_at > now
        }
        self._attempts[state] = OAuthAttempt(
            verifier=verifier, expires_at=now + ATTEMPT_TTL_SECONDS
        )
        params = {
            "response_type": "code",
            "client_id": settings.client_id,
            "redirect_uri": settings.redirect_uri,
            "scope": settings.scopes,
            "state": state,
            "code_challenge": challenge,
            "code_challenge_method": "S256",
        }
        return f"{AUTHORIZE_URL}?{urlencode(params)}"

    async def finish_authorization(
        self, *, code: str, state: str, settings: Settings
    ) -> None:
        settings.validate_oauth()
        attempt = self._attempts.pop(state, None)
        if attempt is None or attempt.expires_at <= time.monotonic():
            raise HTTPException(status_code=400, detail="state OAuth inválido ou expirado")

        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": settings.redirect_uri,
            "client_id": settings.client_id,
            "client_secret": settings.client_secret,
            "code_verifier": attempt.verifier,
        }
        try:
            async with httpx2.AsyncClient(timeout=15) as client:
                response = await client.post(TOKEN_URL, data=data)
                response.raise_for_status()
                self._save_tokens(response.json())
        except (httpx2.HTTPError, ValueError, KeyError, TypeError) as exc:
            # Não repasse corpo, URL de callback, código OAuth ou tokens ao cliente.
            raise HTTPException(
                status_code=502,
                detail="Não foi possível trocar o código OAuth por tokens do iFood.",
            ) from exc

    async def access_token(self, settings: Settings) -> str:
        settings.validate_oauth()
        async with self._refresh_lock:
            if self.tokens is None:
                raise HTTPException(status_code=401, detail="Autentique a conta iFood primeiro.")
            if self.tokens.expires_at - time.time() > 300:
                return self.tokens.access_token

            try:
                async with httpx2.AsyncClient(timeout=15) as client:
                    response = await client.post(
                        TOKEN_URL,
                        data={
                            "grant_type": "refresh_token",
                            "refresh_token": self.tokens.refresh_token,
                            "client_id": settings.client_id,
                            "client_secret": settings.client_secret,
                        },
                    )
                    response.raise_for_status()
                    self._save_tokens(response.json())
            except (httpx2.HTTPError, ValueError, KeyError, TypeError) as exc:
                self.tokens = None
                raise HTTPException(
                    status_code=401,
                    detail="A sessão iFood expirou. Inicie a autenticação novamente.",
                ) from exc
            assert self.tokens is not None
            return self.tokens.access_token

    def _save_tokens(self, payload: dict[str, Any]) -> None:
        access_token = payload["access_token"]
        refresh_token = payload.get("refresh_token")
        expires_in = int(payload.get("expires_in", 3600))
        if not isinstance(access_token, str) or not access_token:
            raise ValueError("Resposta OAuth sem access_token")
        if not isinstance(refresh_token, str) or not refresh_token:
            raise ValueError("Resposta OAuth sem refresh_token")
        self.tokens = TokenSet(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=time.time() + expires_in,
        )
