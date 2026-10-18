"""Captura por imagem: limites, privacidade e ausência de ferramentas comerciais."""
import base64
import io
import os
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import httpx2
from fastapi import HTTPException
from PIL import Image

from app.main import app
from app.vision import (
    MAX_IMAGE_BYTES,
    MAX_REQUEST_BYTES,
    ImageExtraction,
    extract_image,
    prepare_image,
)


def image_url(fmt='JPEG', exif=False):
    output = io.BytesIO()
    image = Image.new('RGB', (16, 10), 'red')
    options = {}
    if exif:
        metadata = Image.Exif()
        metadata[270] = 'synthetic private metadata'
        metadata[274] = 6
        options['exif'] = metadata
    image.save(output, format=fmt, **options)
    mime = {'JPEG': 'jpeg', 'PNG': 'png', 'WEBP': 'webp'}[fmt]
    return f'data:image/{mime};base64,' + base64.b64encode(output.getvalue()).decode()


class ImageValidationTests(unittest.TestCase):
    def test_supported_formats_are_decoded_and_metadata_removed(self):
        for fmt in ('JPEG', 'PNG', 'WEBP'):
            prepared = prepare_image(image_url(fmt, exif=fmt == 'JPEG'))
            raw = base64.b64decode(prepared.split(',')[1])
            with Image.open(io.BytesIO(raw)) as image:
                self.assertEqual(image.format, 'JPEG')
                self.assertEqual(len(image.getexif()), 0)
                if fmt == 'JPEG':
                    self.assertEqual(image.size, (10, 16))
            self.assertNotIn(b'synthetic private metadata', raw)

    def test_invalid_mime_corrupt_data_mismatch_and_oversize_are_rejected(self):
        cases = [
            ('https://example.invalid/private.jpg', 415),
            ('data:image/svg+xml;base64,AAAA', 415),
            ('data:image/png;base64,%%%invalid', 422),
            ('data:image/jpeg;base64,' + base64.b64encode(b'not an image').decode(), 422),
            (image_url('PNG').replace('image/png', 'image/jpeg'), 415),
            ('data:image/jpeg;base64,' + base64.b64encode(b'x' * (MAX_IMAGE_BYTES + 1)).decode(), 413),
        ]
        for data, status in cases:
            with self.assertRaises(HTTPException) as caught:
                prepare_image(data)
            self.assertEqual(caught.exception.status_code, status)

    def test_pixel_limit_and_animation_are_rejected_before_model(self):
        with patch('app.vision.MAX_IMAGE_PIXELS', 100):
            with self.assertRaises(HTTPException) as caught:
                prepare_image(image_url())
            self.assertEqual(caught.exception.status_code, 413)
        output = io.BytesIO()
        Image.new('RGB', (10, 10), 'red').save(output, format='WEBP', save_all=True,
            append_images=[Image.new('RGB', (10, 10), 'blue')], duration=100, loop=0)
        with self.assertRaises(HTTPException) as caught:
            prepare_image('data:image/webp;base64,' + base64.b64encode(output.getvalue()).decode())
        self.assertEqual(caught.exception.status_code, 415)


class VisionTests(unittest.IsolatedAsyncioTestCase):
    async def test_multimodal_request_has_no_tools_or_storage_and_cannot_confirm_quantity(self):
        async def runner(agent, inputs, **kwargs):
            self.assertEqual(agent.tools, [])
            self.assertFalse(agent.model_settings.store)
            self.assertTrue(kwargs['run_config'].tracing_disabled)
            self.assertEqual(inputs[0]['content'][1]['type'], 'input_image')
            return SimpleNamespace(final_output=ImageExtraction(
                mensagem='Confira os ingredientes.',
                ingredientes_reconhecidos=[dict(nome='tomate', quantidade=3, unidade='un')],
                contexto_reconhecido=dict(pessoas=5, orcamento_centavos=3000),
            ))
        with patch('app.vision.Runner.run', side_effect=runner):
            result = await extract_image(image_url(), '')
        self.assertIsNone(result.ingredientes_reconhecidos[0].quantidade)
        self.assertIsNone(result.ingredientes_reconhecidos[0].unidade)
        self.assertFalse(result.ingredientes_reconhecidos[0].confirmado)
        self.assertIsNone(result.contexto_reconhecido.pessoas)
        self.assertEqual(result.produtos, [])
        self.assertEqual(result.opcoes, [])
        self.assertEqual(result.buscas, [])


class ImageAPITests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.life = app.router.lifespan_context(app)
        await self.life.__aenter__()
        self.client = httpx2.AsyncClient(transport=httpx2.ASGITransport(app=app), base_url='http://test')
        self.key = patch.dict(os.environ, {'OPENAI_API_KEY': 'fake-offline-key'})
        self.key.start()

    async def asyncTearDown(self):
        self.key.stop()
        await self.client.aclose()
        await self.life.__aexit__(None, None, None)

    async def test_image_endpoint_returns_same_review_contract_without_mcp_or_session(self):
        with patch('app.vision.Runner.run', new=AsyncMock(return_value=SimpleNamespace(final_output=ImageExtraction(
            mensagem='Confira o tomate.', ingredientes_reconhecidos=[dict(nome='tomate')],
            contexto_reconhecido=dict(pessoas=2),
        )))):
            res = await self.client.post('/api/context/parse-image', json=dict(image_data_url=image_url(), message='Jantar para 2 pessoas'))
        self.assertEqual(res.status_code, 200, res.text)
        data = res.json()
        self.assertFalse(data['mcpToolCalled'])
        self.assertIsNone(data['session_id'])
        self.assertEqual(data['data']['contexto_reconhecido']['pessoas'], 2)
        self.assertFalse(app.state.conversations._sessions)
        self.assertNotIn('base64', res.text)

    async def test_request_limits_and_generic_errors_never_echo_photo(self):
        secret = 'synthetic-photo-data-never-echo'
        with patch('app.main.extract_image', new=AsyncMock()) as model:
            bad = await self.client.post('/api/context/parse-image', json=dict(image_data_url=secret, unexpected=secret))
            self.assertEqual(bad.status_code, 422)
            self.assertNotIn(secret, bad.text)
            wrong_type = await self.client.post('/api/context/parse-image', content=b'invalid')
            self.assertEqual(wrong_type.status_code, 415)
            large = await self.client.post('/api/context/parse-image', content=b'x' * (MAX_REQUEST_BYTES + 1), headers={'Content-Type': 'application/json'})
            self.assertEqual(large.status_code, 413)
            model.assert_not_awaited()

    async def test_timeout_and_provider_failure_preserve_retryable_error(self):
        for failure, status in ((TimeoutError(), 504), (RuntimeError('synthetic provider failure'), 502)):
            with patch('app.main.extract_image', new=AsyncMock(side_effect=failure)):
                res = await self.client.post('/api/context/parse-image', json=dict(image_data_url=image_url()))
            self.assertEqual(res.status_code, status)
            self.assertNotIn('synthetic provider failure', res.text)
            self.assertFalse(app.state.conversations._sessions)


if __name__ == '__main__':
    unittest.main()
