"""Estado da conexão e retorno OAuth, sem chamadas reais ao iFood."""
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import httpx2
from fastapi import HTTPException

from app.main import app


class AuthAPITests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.life = app.router.lifespan_context(app)
        await self.life.__aenter__()
        self.client = httpx2.AsyncClient(
            transport=httpx2.ASGITransport(app=app), base_url='http://test',
        )

    async def asyncTearDown(self):
        await self.client.aclose()
        await self.life.__aexit__(None, None, None)

    async def test_missing_connection_does_not_attempt_refresh(self):
        with patch.object(app.state.ifood_oauth, 'access_token', new=AsyncMock()) as refresh:
            result = await self.client.get('/auth/status')
        self.assertEqual(result.json(), {'authenticated': False})
        self.assertEqual(result.headers['cache-control'], 'no-store')
        refresh.assert_not_awaited()

    async def test_status_checks_token_validity_without_returning_tokens(self):
        app.state.ifood_oauth.tokens = SimpleNamespace()
        with patch.object(app.state.ifood_oauth, 'access_token', new=AsyncMock(return_value='private-token')) as refresh:
            result = await self.client.get('/auth/status')
        refresh.assert_awaited_once()
        self.assertEqual(result.json(), {'authenticated': True})
        self.assertNotIn('private-token', result.text)

    async def test_expired_session_is_disconnected_but_service_errors_stay_errors(self):
        app.state.ifood_oauth.tokens = SimpleNamespace()
        for status, expected in ((401, 200), (503, 503)):
            with patch.object(app.state.ifood_oauth, 'access_token', new=AsyncMock(side_effect=HTTPException(status, 'Unavailable'))):
                result = await self.client.get('/auth/status')
            self.assertEqual(result.status_code, expected)
            if status == 401:
                self.assertEqual(result.json(), {'authenticated': False})

    async def test_callback_directs_back_to_app_without_echoing_oauth_parameters(self):
        with patch.object(app.state.ifood_oauth, 'finish_authorization', new=AsyncMock()) as finish:
            result = await self.client.get('/auth/callback', params={'code': 'private-code', 'state': 'private-state'})
        finish.assert_awaited_once()
        self.assertEqual(result.status_code, 200)
        self.assertIn('Volte para a aba da Despensa Reversa', result.text)
        self.assertNotIn('private-code', result.text)
        self.assertNotIn('private-state', result.text)
        self.assertNotIn('/mcp/tools', result.text)
        self.assertEqual(result.headers['cache-control'], 'no-store')
        self.assertEqual(result.headers['referrer-policy'], 'no-referrer')

    async def test_rejected_or_incomplete_callback_does_not_exchange_tokens(self):
        with patch.object(app.state.ifood_oauth, 'finish_authorization', new=AsyncMock()) as finish:
            for params in ({'error': 'access_denied'}, {'code': 'code-without-state'}):
                result = await self.client.get('/auth/callback', params=params)
                self.assertEqual(result.status_code, 400)
        finish.assert_not_awaited()


if __name__ == '__main__':
    unittest.main()
