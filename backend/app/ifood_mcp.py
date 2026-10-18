"""Cliente MCP oficial usando o SDK Python e transporte Streamable HTTP."""

import json
import asyncio
import logging
from typing import Any

import httpx2
from fastapi import HTTPException
from mcp import Client
from mcp.client.streamable_http import streamable_http_client
from jsonschema import Draft202012Validator


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


async def _search_groceries_once(
    *,
    mcp_url: str,
    access_token: str,
    query: str,
    latitude: float,
    longitude: float,
    refinements: dict[str, Any] | None = None,
) -> Any:
    http_client, transport = await _connected_client(mcp_url, access_token)
    try:
        async with http_client:
            async with Client(transport) as client:
                available = await client.list_tools()
                tool = next((tool for tool in available.tools if tool.name == "searchOffers"), None)
                if tool is None:
                    raise HTTPException(
                        status_code=502,
                        detail="O MCP conectado não anunciou a ferramenta searchOffers.",
                    )
                arguments = {
                        "query": query,
                        "resultKind": "ITEM",
                        "merchantType": "GROCERIES",
                        "userLocation": {
                            "latitude": latitude,
                            "longitude": longitude,
                        },
                        "pageSize": 5,
                    }
                if refinements:
                    arguments["refinements"] = refinements
                if not Draft202012Validator(tool.input_schema).is_valid(arguments):
                    raise HTTPException(502, "Os argumentos não correspondem ao schema anunciado de searchOffers.")
                result = await client.call_tool("searchOffers", arguments)
                return {
                    "tool": "searchOffers",
                    "isError": result.is_error,
                    "result": _tool_result_payload(result),
                }
    except HTTPException:
        raise
    except Exception as exc:
        logging.getLogger(__name__).warning("MCP searchOffers falhou (%s)", type(exc).__name__)
        raise HTTPException(
            status_code=502,
            detail="A chamada searchOffers ao MCP do iFood falhou.",
        ) from exc


async def call_tool(*, mcp_url: str, access_token: str, name: str, candidates: list[dict[str, Any]]) -> dict[str, Any]:
    """Chamada única, sem retry: createCart não é idempotente.

    Usa o primeiro conjunto de argumentos aceito pelo inputSchema anunciado;
    o schema real prevalece sobre os exemplos da documentação.
    """
    http_client, transport = await _connected_client(mcp_url, access_token)
    try:
        async with http_client:
            async with Client(transport) as client:
                available = await client.list_tools()
                tool = next((tool for tool in available.tools if tool.name == name), None)
                if tool is None:
                    raise HTTPException(
                        status_code=502,
                        detail=f"O MCP conectado não anunciou a ferramenta {name}. Confira os escopos de endereço e carrinho em IFOOD_SCOPES.",
                    )
                validator = Draft202012Validator(tool.input_schema)
                arguments = next((args for args in candidates if validator.is_valid(args)), None)
                if arguments is None:
                    raise HTTPException(502, f"Os argumentos não correspondem ao schema anunciado de {name}.")
                result = await client.call_tool(name, arguments)
                return {"tool": name, "isError": result.is_error, "result": _tool_result_payload(result)}
    except HTTPException:
        raise
    except Exception as exc:
        logging.getLogger(__name__).warning("MCP %s falhou (%s)", name, type(exc).__name__)
        raise HTTPException(status_code=502, detail=f"A chamada {name} ao MCP do iFood falhou.") from exc


def _transient(exc: BaseException | None) -> bool:
    if isinstance(exc, (httpx2.TransportError, TimeoutError, ConnectionError)):
        return True
    if isinstance(exc, BaseExceptionGroup):
        return bool(exc.exceptions) and all(_transient(e) for e in exc.exceptions)
    return False


async def search_groceries(
    *, mcp_url: str, access_token: str, query: str, latitude: float,
    longitude: float, refinements: dict[str, Any] | None = None,
) -> Any:
    """No máximo um retry de transporte para esta operação exclusivamente de leitura."""
    for attempt in range(2):
        try:
            return await _search_groceries_once(
                mcp_url=mcp_url, access_token=access_token, query=query,
                latitude=latitude, longitude=longitude, refinements=refinements,
            )
        except HTTPException as exc:
            if attempt or not _transient(exc.__cause__):
                raise
            await asyncio.sleep(0.2)


async def search_groceries_text(
    *,
    mcp_url: str,
    access_token: str,
    query: str,
    latitude: float,
    longitude: float,
) -> str:
    result = await search_groceries(
        mcp_url=mcp_url,
        access_token=access_token,
        query=query,
        latitude=latitude,
        longitude=longitude,
    )
    return json.dumps(result, ensure_ascii=False)
