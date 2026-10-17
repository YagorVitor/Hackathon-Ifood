"""Cliente MCP oficial usando o SDK Python e transporte Streamable HTTP."""

from typing import Any

import httpx2
from fastapi import HTTPException
from mcp import Client
from mcp.client.streamable_http import streamable_http_client


async def _connected_client(mcp_url: str, access_token: str):
    http_client = httpx2.AsyncClient(
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=httpx2.Timeout(30.0, read=60.0),
    )
    transport = streamable_http_client(mcp_url, http_client=http_client)
    return http_client, transport


async def list_tools(mcp_url: str, access_token: str) -> list[dict[str, Any]]:
    http_client, transport = await _connected_client(mcp_url, access_token)
    try:
        async with http_client:
            async with Client(transport) as client:
                result = await client.list_tools()
                return [
                    {
                        "name": tool.name,
                        "description": tool.description,
                        "inputSchema": tool.input_schema,
                    }
                    for tool in result.tools
                ]
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="Não foi possível consultar tools/list no MCP do iFood.",
        ) from exc


def _tool_result_payload(result: Any) -> Any:
    if result.structured_content is not None:
        return result.structured_content
    payload: list[dict[str, str]] = []
    for block in result.content:
        text = getattr(block, "text", None)
        if isinstance(text, str):
            payload.append({"type": "text", "text": text})
    return payload


async def search_groceries(
    *,
    mcp_url: str,
    access_token: str,
    query: str,
    latitude: float,
    longitude: float,
) -> Any:
    http_client, transport = await _connected_client(mcp_url, access_token)
    try:
        async with http_client:
            async with Client(transport) as client:
                available = await client.list_tools()
                if not any(tool.name == "searchOffers" for tool in available.tools):
                    raise HTTPException(
                        status_code=502,
                        detail="O MCP conectado não anunciou a ferramenta searchOffers.",
                    )
                result = await client.call_tool(
                    "searchOffers",
                    {
                        "query": query,
                        "resultKind": "ITEM",
                        "merchantType": "GROCERIES",
                        "userLocation": {
                            "latitude": latitude,
                            "longitude": longitude,
                        },
                        "pageSize": 5,
                    },
                )
                return {
                    "tool": "searchOffers",
                    "isError": result.is_error,
                    "result": _tool_result_payload(result),
                }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="A chamada searchOffers ao MCP do iFood falhou.",
        ) from exc
