import unittest
from types import SimpleNamespace as NS
from unittest.mock import AsyncMock, call, patch

import httpx2
from fastapi import HTTPException

from app import ifood_mcp
from app.ifood_mcp import _available_tools, tool_failure


class MCPErrorTests(unittest.TestCase):
    def test_grouped_http_failures_preserve_action_without_exposing_provider_data(self):
        for status in (401, 403):
            request = httpx2.Request("POST", "https://example.test/private?token=do-not-echo")
            failure = httpx2.HTTPStatusError(
                "do-not-echo", request=request, response=httpx2.Response(status, request=request)
            )
            classified = tool_failure("listAddresses", ExceptionGroup("transport", [failure]))
            self.assertEqual(classified.status_code, status)
            self.assertNotIn("do-not-echo", classified.detail)
            self.assertIn("listAddresses", classified.detail)

    def test_timeout_is_not_reported_as_an_empty_list(self):
        error = tool_failure(
            "listAddresses", ExceptionGroup("transport", [TimeoutError("private")])
        )
        self.assertEqual(error.status_code, 504)
        self.assertNotIn("private", error.detail)
        self.assertEqual(tool_failure("listAddresses", RuntimeError("private")).status_code, 502)


class MCPClientTests(unittest.IsolatedAsyncioTestCase):
    async def test_tool_on_second_page_is_found_before_call(self):

        tool = NS(name="getCart", input_schema={"type": "object", "required": ["cartId"]})
        client = AsyncMock()
        client.list_tools.side_effect = [
            NS(tools=[], next_cursor="page-2"),
            NS(tools=[tool], next_cursor=None),
        ]
        client.call_tool.return_value = NS(
            structured_content={"cartId": "synthetic-cart"}, is_error=False
        )
        manager = AsyncMock()
        manager.__aenter__.return_value = client
        with patch("app.ifood_mcp._connected_client", return_value=manager):
            result = await ifood_mcp.call_tool(
                mcp_url="https://example.invalid",
                access_token="synthetic-token",
                name="getCart",
                arguments={"cartId": "synthetic-cart"},
            )
        self.assertEqual(result["result"]["cartId"], "synthetic-cart")
        self.assertEqual(
            client.list_tools.await_args_list, [call(cursor=None), call(cursor="page-2")]
        )
        client.call_tool.assert_awaited_once_with("getCart", {"cartId": "synthetic-cart"})
        manager.__aexit__.assert_awaited_once()

    async def test_missing_tool_or_invalid_arguments_never_write(self):

        tool = NS(name="createCart", input_schema={"type": "object", "required": ["items"]})
        for tools in ([], [tool]):
            client = AsyncMock()
            client.list_tools.return_value = NS(tools=tools, next_cursor=None)
            manager = AsyncMock()
            manager.__aenter__.return_value = client
            with patch("app.ifood_mcp._connected_client", return_value=manager):
                with self.assertRaises(HTTPException) as raised:
                    await ifood_mcp.call_tool(
                        mcp_url="https://example.invalid",
                        access_token="synthetic-token",
                        name="createCart",
                        arguments={},
                    )
            self.assertEqual(raised.exception.status_code, 502)
            client.call_tool.assert_not_awaited()

    async def test_write_timeout_is_not_retried(self):

        client = AsyncMock()
        client.list_tools.return_value = NS(
            tools=[NS(name="createCart", input_schema={"type": "object"})], next_cursor=None
        )
        client.call_tool.side_effect = TimeoutError("private")
        manager = AsyncMock()
        manager.__aenter__.return_value = client
        with patch("app.ifood_mcp._connected_client", return_value=manager):
            with self.assertRaises(HTTPException) as raised:
                await ifood_mcp.call_tool(
                    mcp_url="https://example.invalid",
                    access_token="synthetic-token",
                    name="createCart",
                    arguments={},
                )
        self.assertEqual(raised.exception.status_code, 504)
        client.call_tool.assert_awaited_once()

    async def test_repeated_pagination_cursor_stops_discovery(self):

        client = AsyncMock()
        client.list_tools.return_value = NS(tools=[], next_cursor="same-page")
        with self.assertRaises(HTTPException):
            await _available_tools(client)
        self.assertEqual(client.list_tools.await_count, 2)
