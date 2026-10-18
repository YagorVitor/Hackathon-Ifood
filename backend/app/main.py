import os
import secrets
import asyncio
from uuid import UUID
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel, Field, ValidationError

from . import cart, ifood_mcp
from .agent import run_agent
from .auth_pages import CONNECTED_PAGE
from .context import ConversationStore
from .contracts import (Address, AgentRequest, AgentResponse, CartConfirmRequest, CartProposal,
    CartProposalRequest, CartResult, SearchCriteria, UserContext)
from .recommendations import build_refinements
from .oauth import IfoodOAuth
from .settings import Settings
from .vision import ImageParseRequest, MAX_REQUEST_BYTES, extract_image, prepare_image


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.ifood_oauth = IfoodOAuth()
    app.state.conversations = ConversationStore()
    app.state.cart = cart.CartStore()
    app.state.connection_id = secrets.token_urlsafe(16)
    yield


app = FastAPI(
    title="CompletAI — teste do iFood MCP",
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
    # Um novo login pode trocar a conta: nenhum destino/produto anterior é reutilizado.
    request.app.state.cart = cart.CartStore()
    request.app.state.connection_id = secrets.token_urlsafe(16)
    return HTMLResponse(
        CONNECTED_PAGE,
        headers={"Cache-Control": "no-store", "Referrer-Policy": "no-referrer"},
    )


@app.get("/auth/status")
async def auth_status(request: Request, response: Response) -> dict[str, bool | str]:
    response.headers['Cache-Control'] = 'no-store'
    oauth = request.app.state.ifood_oauth
    if oauth.tokens is None:
        return {"authenticated": False}
    try:
        # A presença de um token vencido não significa que a conta segue conectada.
        # access_token renova com o buffer de cinco minutos já usado pelo MCP.
        await oauth.access_token(Settings.from_env())
    except HTTPException as exc:
        if exc.status_code == 401:
            return {"authenticated": False}
        raise
    return {"authenticated": True, "connection_id": request.app.state.connection_id}


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
        connection_id = request.app.state.connection_id

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
        if connection_id != request.app.state.connection_id:
            raise HTTPException(409, "A conexão iFood mudou durante a consulta. Faça uma nova busca.")
        store.commit(session_id, envelope, execution.output)
        # Só estes snapshots do MCP podem entrar numa proposta de carrinho.
        request.app.state.cart.remember(execution.output.produtos, envelope.contexto.localizacao)
        return AgentResponse(
            response=execution.output.mensagem, mcpToolCalled=execution.mcp_called,
            tool="searchOffers" if execution.mcp_called else None,
            session_id=session_id, data=execution.output,
        )


@app.post('/api/context/parse-image', response_model=AgentResponse, openapi_extra={
    'requestBody': {'required': True, 'content': {'application/json': {'schema': ImageParseRequest.model_json_schema()}}},
})
async def parse_image(request: Request) -> AgentResponse:
    if request.headers.get('content-type', '').split(';')[0].strip() != 'application/json':
        raise HTTPException(415, 'Envie a imagem como JSON.')
    # Leitura limitada antes do parse; UploadFile poderia gravar fotos em disco.
    body = bytearray()
    async for chunk in request.stream():
        if len(body) + len(chunk) > MAX_REQUEST_BYTES:
            raise HTTPException(413, 'A imagem deve ter no máximo 5 MB.')
        body.extend(chunk)
    try:
        payload = ImageParseRequest.model_validate_json(bytes(body))
    except ValidationError:
        # Não devolver errors()/input: podem conter a fotografia em base64.
        raise HTTPException(422, 'Imagem ou texto inválido. Use JPEG, PNG ou WebP de até 5 MB.') from None
    if not os.getenv('OPENAI_API_KEY'):
        raise HTTPException(503, 'A análise de imagens está indisponível no momento.')
    try:
        image = await asyncio.to_thread(prepare_image, payload.image_data_url)
        output = await asyncio.wait_for(extract_image(image, payload.message, payload.language), timeout=90)
    except HTTPException:
        raise
    except TimeoutError as exc:
        raise HTTPException(504, 'A análise da foto demorou demais. Tente novamente ou descreva os ingredientes.') from exc
    except Exception as exc:
        raise HTTPException(502, 'Não foi possível analisar a foto. Tente outra imagem ou descreva os ingredientes.') from exc
    return AgentResponse(response=output.mensagem, mcpToolCalled=False, tool=None, session_id=None, data=output)


@app.delete("/api/agent/sessions/{session_id}")
async def forget_agent_session(session_id: str, request: Request) -> dict[str, bool]:
    store = request.app.state.conversations
    async with store.lock:
        store.delete(session_id)
    return {"deleted": True}


@app.get("/api/addresses", response_model=list[Address])
async def list_addresses(request: Request) -> list[Address]:
    settings = Settings.from_env()
    token = await request.app.state.ifood_oauth.access_token(settings)
    if 'mcp.user.addresses.read' not in settings.scopes.split():
        raise HTTPException(503, "A conexão atual não solicita leitura de endereços. Configure mcp.user.addresses.read apenas se homologado para o agente, reinicie o backend e conecte o iFood novamente.")
    response = await ifood_mcp.call_tool(mcp_url=settings.mcp_url, access_token=token, name="listAddresses", candidates=[{}])
    addresses = cart.parse_addresses(response)
    request.app.state.cart.set_addresses(addresses)
    return addresses


@app.post("/api/cart/proposal", response_model=CartProposal)
async def cart_proposal(payload: CartProposalRequest, request: Request) -> CartProposal:
    await request.app.state.ifood_oauth.access_token(Settings.from_env())
    return request.app.state.cart.propose(payload)


@app.post("/api/cart/confirm", response_model=CartResult)
async def cart_confirm(payload: CartConfirmRequest, request: Request) -> CartResult:
    store = request.app.state.cart
    proposal = store.begin(payload)
    if isinstance(proposal, CartResult):
        return proposal
    write_started = False
    created = None
    cart_id = None
    try:
        settings = Settings.from_env()
        token = await request.app.state.ifood_oauth.access_token(settings)
        if store is not request.app.state.cart:
            raise HTTPException(409, "A conexão iFood mudou. Revise o carrinho novamente.")
        try:
            write_started = True
            created = await ifood_mcp.call_tool(
                mcp_url=settings.mcp_url, access_token=token, name="createCart",
                candidates=cart.create_cart_arguments(proposal),
            )
        except HTTPException as exc:
            if exc.__cause__ is not None:
                store.uncertain(proposal.id)
                # Falha de transporte após o envio: o carrinho pode ter sido criado.
                raise HTTPException(502, "Não foi possível confirmar a criação do carrinho. Confira o app do iFood antes de tentar de novo.") from exc
            write_started = False
            raise
        try:
            cart_id = cart.cart_id_of(created)
        except cart.CartCreationUncertain:
            store.uncertain(proposal.id)
            raise
        except HTTPException:
            write_started = False
            raise
        try:
            snapshot = await ifood_mcp.call_tool(
                mcp_url=settings.mcp_url, access_token=token, name="getCart", candidates=[{"cartId": cart_id}],
            )
            result = cart.build_result(proposal, cart_id, snapshot, [], created=created)
        except HTTPException:
            # O carrinho já existe; não repetir createCart por causa de uma leitura.
            result = cart.build_result(proposal, cart_id, created, [
                "getCart não respondeu; os dados exibidos são os devolvidos por createCart.",
            ])
    except BaseException:
        if cart_id is not None:
            # A leitura pode ser cancelada após a escrita ter sido confirmada.
            store.finish(cart.build_result(proposal, cart_id, created, [
                "A conferência foi interrompida; o carrinho já foi criado. Não repita a criação.",
            ]))
        elif write_started:
            # Inclusive CancelledError: não sabemos se o servidor recebeu a escrita.
            store.uncertain(proposal.id)
        else:
            store.release(proposal.id)
        raise
    store.finish(result)
    return result


@app.get("/api/cart/{cart_id}")
async def inspect_cart(cart_id: UUID, request: Request, response: Response) -> dict[str, object]:
    """Consulta um carrinho existente na conta OAuth, sem chamar createCart."""
    response.headers["Cache-Control"] = "no-store"
    settings = Settings.from_env()
    token = await request.app.state.ifood_oauth.access_token(settings)
    identifier = str(cart_id)
    snapshot = await ifood_mcp.call_tool(
        mcp_url=settings.mcp_url, access_token=token, name="getCart",
        candidates=[{"cartId": identifier}],
    )
    return cart.inspect_result(snapshot, identifier)
