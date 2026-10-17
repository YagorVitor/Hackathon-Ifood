import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel, Field

from . import ifood_mcp
from .agent import run_agent
from .context import ConversationStore
from .contracts import AgentRequest, AgentResponse, SearchCriteria, UserContext
from .recommendations import build_refinements
from .oauth import IfoodOAuth
from .settings import Settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.ifood_oauth = IfoodOAuth()
    app.state.conversations = ConversationStore()
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
    latitude: float = Field(ge=-90, le=90, allow_inf_nan=False)
    longitude: float = Field(ge=-180, le=180, allow_inf_nan=False)
    criteria: SearchCriteria = Field(default_factory=SearchCriteria)


@app.get("/health")
@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/auth/login")
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


@app.get("/api/integration/tools")
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
        refinements=build_refinements(UserContext(criterios_busca=payload.criteria)),
    )


@app.post("/api/agent/message", response_model=AgentResponse)
@app.post("/agent/test", response_model=AgentResponse)
async def agent_test(payload: AgentRequest, request: Request) -> AgentResponse:
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(status_code=503, detail="Configure OPENAI_API_KEY no backend.")
    settings = Settings.from_env()
    store = request.app.state.conversations
    async with store.lock:
        session_id, envelope = store.prepare(payload)

        async def get_token():
            return await request.app.state.ifood_oauth.access_token(settings)

        try:
            execution = await asyncio.wait_for(
                run_agent(envelope, mcp_url=settings.mcp_url, get_access_token=get_token),
                timeout=90,
            )
        except HTTPException:
            raise
        except TimeoutError as exc:
            raise HTTPException(504, "O agente excedeu o tempo de execução. Nenhuma compra foi realizada.") from exc
        except Exception as exc:
            raise HTTPException(502, "O agente não produziu uma resposta válida. Tente novamente.") from exc
        store.commit(session_id, envelope, execution.output)
        return AgentResponse(
            response=execution.output.mensagem, mcpToolCalled=execution.mcp_called,
            tool="searchOffers" if execution.mcp_called else None,
            session_id=session_id, data=execution.output,
        )


@app.delete("/api/agent/sessions/{session_id}")
async def forget_agent_session(session_id: str, request: Request) -> dict[str, bool]:
    store = request.app.state.conversations
    async with store.lock:
        store.delete(session_id)
    return {"deleted": True}
