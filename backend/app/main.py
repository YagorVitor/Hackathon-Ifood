import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel, Field

from . import ifood_mcp
from .agent import run_market_test
from .oauth import IfoodOAuth
from .settings import Settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.ifood_oauth = IfoodOAuth()
    yield


app = FastAPI(
    title="Despensa Reversa — teste do iFood MCP",
    description="Backend local mínimo para autenticar e consultar ferramentas de descoberta.",
    version="0.1.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class GrocerySearch(BaseModel):
    query: str = Field(min_length=1, max_length=120)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class AgentTestInput(GrocerySearch):
    message: str = Field(min_length=1, max_length=1200)


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/auth/ifood")
async def start_ifood_auth(request: Request) -> RedirectResponse:
    settings = Settings.from_env()
    try:
        authorization_url = request.app.state.ifood_oauth.authorization_url(settings)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return RedirectResponse(authorization_url, status_code=302)


@app.get("/auth/callback")
async def ifood_callback(
    request: Request,
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
) -> HTMLResponse:
    if error:
        raise HTTPException(status_code=400, detail="Autorização iFood não concluída.")
    if not code or not state:
        raise HTTPException(status_code=400, detail="Callback OAuth sem code ou state.")
    await request.app.state.ifood_oauth.finish_authorization(
        code=code, state=state, settings=Settings.from_env()
    )
    return HTMLResponse(
        "<main><h1>Conta iFood conectada</h1>"
        "<p>Agora você pode consultar <a href='/mcp/tools'>as ferramentas MCP</a>.</p></main>"
    )


@app.get("/auth/status")
async def auth_status(request: Request) -> dict[str, bool]:
    return {"authenticated": request.app.state.ifood_oauth.tokens is not None}


@app.get("/mcp/tools")
async def mcp_tools(request: Request) -> dict[str, object]:
    settings = Settings.from_env()
    token = await request.app.state.ifood_oauth.access_token(settings)
    tools = await ifood_mcp.list_tools(settings.mcp_url, token)
    return {"endpoint": settings.mcp_url, "tools": tools}


@app.post("/mcp/test-search")
async def mcp_test_search(payload: GrocerySearch, request: Request) -> dict[str, object]:
    settings = Settings.from_env()
    token = await request.app.state.ifood_oauth.access_token(settings)
    return await ifood_mcp.search_groceries(
        mcp_url=settings.mcp_url,
        access_token=token,
        query=payload.query,
        latitude=payload.latitude,
        longitude=payload.longitude,
    )


@app.post("/agent/test")
async def agent_test(payload: AgentTestInput, request: Request) -> dict[str, object]:
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(status_code=503, detail="Configure OPENAI_API_KEY no backend.")
    settings = Settings.from_env()
    token = await request.app.state.ifood_oauth.access_token(settings)
    try:
        response, tool_called = await run_market_test(
            message=payload.message,
            latitude=payload.latitude,
            longitude=payload.longitude,
            mcp_url=settings.mcp_url,
            access_token=token,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="O teste do agente falhou ao processar a solicitação.",
        ) from exc
    return {
        "response": response,
        "mcpToolCalled": tool_called,
        "tool": "searchOffers" if tool_called else None,
    }
