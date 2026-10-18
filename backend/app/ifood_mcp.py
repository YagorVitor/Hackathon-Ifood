"""Cliente MCP oficial usando o SDK Python e transporte Streamable HTTP."""

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Any, Literal

import httpx2
from fastapi import HTTPException
from jsonschema import Draft202012Validator
from mcp import Client
from mcp.client.streamable_http import streamable_http_client
from mcp.types import Tool


@asynccontextmanager
async def _connected_client(mcp_url: str, access_token: str):
    async with httpx2.AsyncClient(
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=httpx2.Timeout(30.0, read=60.0),
    ) as http_client:
        transport = streamable_http_client(mcp_url, http_client=http_client)
        async with Client(transport) as client:
            yield client


async def _available_tools(client: Client) -> list[Tool]:
    tools = []
    cursor = None
    seen = set()
    while True:
        page = await client.list_tools(cursor=cursor)
        tools.extend(page.tools)
        cursor = page.next_cursor
        if cursor is None:
            return tools
        if cursor in seen:
            raise HTTPException(502, "O MCP repetiu um cursor de tools/list.")
        seen.add(cursor)


async def list_tools(mcp_url: str, access_token: str) -> list[dict[str, Any]]:
    try:
        async with _connected_client(mcp_url, access_token) as client:
            return [
                {
                    "name": tool.name,
                    "description": tool.description,
                    "inputSchema": tool.input_schema,
                }
                for tool in await _available_tools(client)
            ]
    except HTTPException:
        raise
    except Exception as exc:
        raise tool_failure("tools/list", exc) from exc


def _tool_result_payload(result: Any) -> Any:
    if result.structured_content is not None:
        return result.structured_content
    payload: list[dict[str, str]] = []
    for block in result.content:
        text = getattr(block, "text", None)
        if isinstance(text, str):
            payload.append({"type": "text", "text": text})
    return payload


MerchantType = Literal[
    "RESTAURANT", "GROCERIES", "LIQUORSTORE", "DRUGSTORE", "PETSTORE", "SHOPPING"
]


async def _search_items_once(
    *,
    mcp_url: str,
    access_token: str,
    query: str,
    latitude: float,
    longitude: float,
    refinements: dict[str, Any] | None = None,
    merchant_type: MerchantType | None = None,
) -> Any:
    arguments = {
        "query": query,
        "resultKind": "ITEM",
        "userLocation": {"latitude": latitude, "longitude": longitude},
        "pageSize": 5,
        "refinements": {**(refinements or {}), "onlyOpen": True},
    }
    if merchant_type is not None:
        arguments["merchantType"] = merchant_type
    return await call_tool(
        mcp_url=mcp_url,
        access_token=access_token,
        name="searchOffers",
        arguments=arguments,
    )


def tool_failure(name: str, exc: Exception) -> HTTPException:
    """Classifica causas sem registrar URLs, corpos, tokens ou endereços."""
    pending: list[BaseException] = [exc]
    seen: set[int] = set()
    statuses: set[int] = set()
    timed_out = False
    while pending:
        current = pending.pop()
        if id(current) in seen:
            continue
        seen.add(id(current))
        if isinstance(current, BaseExceptionGroup):
            pending.extend(current.exceptions)
        if current.__cause__ is not None:
            pending.append(current.__cause__)
        if isinstance(current, httpx2.HTTPStatusError):
            statuses.add(current.response.status_code)
        timed_out |= isinstance(current, (TimeoutError, httpx2.TimeoutException))
    if 401 in statuses:
        return HTTPException(
            401, f"A sessão iFood não autorizou {name}. Conecte sua conta novamente."
        )
    if 403 in statuses:
        return HTTPException(
            403,
            f"O iFood negou acesso a {name}. Confira os escopos homologados e refaça a conexão após atualizar a configuração.",
        )
    if timed_out:
        return HTTPException(
            504, f"A consulta {name} ao iFood demorou demais. Tente novamente mais tarde."
        )
    return HTTPException(
        502,
        f"A chamada {name} ao MCP do iFood falhou. Não foi possível confirmar o resultado da consulta.",
    )


async def call_tool(
    *,
    mcp_url: str,
    access_token: str,
    name: str,
    arguments: dict[str, Any],
) -> dict[str, Any]:
    """Valida o schema anunciado e chama uma vez; createCart não é idempotente."""
    try:
        async with _connected_client(mcp_url, access_token) as client:
            available = await _available_tools(client)
            tool = next((tool for tool in available if tool.name == name), None)
            if tool is None:
                raise HTTPException(
                    502,
                    f"O MCP conectado não anunciou a ferramenta {name}. Confira os escopos homologados para esta conexão.",
                )
            if not Draft202012Validator(tool.input_schema).is_valid(arguments):
                raise HTTPException(
                    502, f"Os argumentos não correspondem ao schema anunciado de {name}."
                )
            result = await client.call_tool(name, arguments)
            return {
                "tool": name,
                "isError": result.is_error,
                "result": _tool_result_payload(result),
            }
    except HTTPException:
        raise
    except Exception as exc:
        logging.getLogger(__name__).warning("MCP %s falhou (%s)", name, type(exc).__name__)
        raise tool_failure(name, exc) from exc


def _transient(exc: BaseException | None) -> bool:
    if isinstance(exc, (httpx2.TransportError, TimeoutError, ConnectionError)):
        return True
    if isinstance(exc, BaseExceptionGroup):
        return bool(exc.exceptions) and all(_transient(e) for e in exc.exceptions)
    return False


async def search_items(
    *,
    mcp_url: str,
    access_token: str,
    query: str,
    latitude: float,
    longitude: float,
    refinements: dict[str, Any] | None = None,
    merchant_type: MerchantType | None = None,
) -> Any:
    """No máximo um retry de transporte para esta operação exclusivamente de leitura."""
    for attempt in range(2):
        try:
            return await _search_items_once(
                mcp_url=mcp_url,
                access_token=access_token,
                query=query,
                latitude=latitude,
                longitude=longitude,
                refinements=refinements,
                merchant_type=merchant_type,
            )
        except HTTPException as exc:
            if attempt or not _transient(exc.__cause__):
                raise
            await asyncio.sleep(0.2)


async def search_groceries(
    *,
    mcp_url: str,
    access_token: str,
    query: str,
    latitude: float,
    longitude: float,
    refinements: dict[str, Any] | None = None,
) -> Any:
    """Compatibilidade com a rota explícita de Mercado; o agente usa search_items."""
    return await search_items(
        mcp_url=mcp_url,
        access_token=access_token,
        query=query,
        latitude=latitude,
        longitude=longitude,
        refinements=refinements,
        merchant_type="GROCERIES",
    )
