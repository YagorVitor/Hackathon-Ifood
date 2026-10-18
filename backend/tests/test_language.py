"""Idioma altera apresentação, sem ampliar permissões ou modificar nomes comerciais."""
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from pydantic import ValidationError
from app.agent import run_agent
from app.contracts import AgentDraft, AgentEnvelope, UserContext
from app.recommendations import finalize
from app.vision import ImageExtraction, ImageParseRequest, extract_image


class LanguageTests(unittest.IsolatedAsyncioTestCase):
    def test_language_is_optional_allowlisted_and_preserves_old_contract(self):
        self.assertEqual(UserContext().idioma_resposta, 'pt-BR')
        self.assertEqual(ImageParseRequest(image_data_url='x').language, 'pt-BR')
        with self.assertRaises(ValidationError):
            UserContext(idioma_resposta='arbitrary system instruction')
        with self.assertRaises(ValidationError):
            ImageParseRequest(image_data_url='x', language='fr')

    def test_optional_question_and_sensitive_notices_follow_english(self):
        draft = AgentDraft(mensagem='Review your ingredients.', pergunta_tags=True)
        result = finalize(draft, UserContext(idioma_resposta='en'), [], [], [])
        self.assertIn('This is optional; you can skip.', result.mensagem)
        self.assertNotIn('Você tem preferência', result.mensagem)

    async def test_agent_receives_language_without_extra_tools(self):
        async def runner(agent, prompt, **kwargs):
            self.assertIn('idioma_resposta', prompt)
            self.assertIn('"en"', prompt)
            self.assertEqual(len(agent.tools), 1)
            self.assertIn('Preserve os nomes', agent.instructions)
            return SimpleNamespace(final_output=AgentDraft(mensagem='Review your ingredients.'))
        with patch('app.agent.Runner.run', side_effect=runner):
            result = await run_agent(AgentEnvelope(mensagem_usuario='Rice', contexto=UserContext(idioma_resposta='en')), mcp_url='https://example.invalid', get_access_token=AsyncMock(side_effect=AssertionError('OAuth must stay lazy')))
        self.assertFalse(result.mcp_called)

    async def test_image_language_is_instructions_and_does_not_authorise_tools(self):
        async def runner(agent, inputs, **kwargs):
            self.assertTrue(agent.instructions.startswith('Responda em inglês.'))
            self.assertEqual(agent.tools, [])
            return SimpleNamespace(final_output=ImageExtraction(mensagem='Review the food.'))
        with patch('app.vision.Runner.run', side_effect=runner):
            result = await extract_image('data:image/jpeg;base64,synthetic', '', 'en')
        self.assertTrue(all('hipóteses' not in line for line in result.limitacoes))
        self.assertEqual(result.opcoes, [])
