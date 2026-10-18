import unittest
import httpx2
from app.ifood_mcp import tool_failure


class MCPErrorTests(unittest.TestCase):
    def test_grouped_http_failures_preserve_action_without_exposing_provider_data(self):
        for status in (401, 403):
            request = httpx2.Request('POST', 'https://example.test/private?token=do-not-echo')
            failure = httpx2.HTTPStatusError('do-not-echo', request=request, response=httpx2.Response(status, request=request))
            classified = tool_failure('listAddresses', ExceptionGroup('transport', [failure]))
            self.assertEqual(classified.status_code, status)
            self.assertNotIn('do-not-echo', classified.detail)
            self.assertIn('listAddresses', classified.detail)

    def test_timeout_is_not_reported_as_an_empty_list(self):
        error = tool_failure('listAddresses', ExceptionGroup('transport', [TimeoutError('private')]))
        self.assertEqual(error.status_code, 504)
        self.assertNotIn('private', error.detail)
        self.assertEqual(tool_failure('listAddresses', RuntimeError('private')).status_code, 502)
