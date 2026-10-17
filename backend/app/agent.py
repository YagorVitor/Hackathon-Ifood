"""Agente de uma ferramenta para validar o ciclo texto → MCP → resposta."""

import os

from agents import Agent, Runner, function_tool

from . import ifood_mcp


async def run_market_test(
    *,
    message: str,
    latitude: float,
    longitude: float,
    mcp_url: str,
    access_token: str,
) -> tuple[str, bool]:
    tool_state = {"called": False}

    @function_tool
    async def search_market_items(query: str) -> str:
        """Search live iFood Mercado items using a descriptive product query."""
        tool_state["called"] = True
        return await ifood_mcp.search_groceries_text(
            mcp_url=mcp_url,
            access_token=access_token,
            query=query,
            latitude=latitude,
            longitude=longitude,
        )

    agent = Agent(
        name="Despensa Reversa — teste de Mercado",
        model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
        instructions=(
            "Você é o agente de teste da Despensa Reversa. Para localizar um produto "
            "no iFood Mercado, escolha um termo descritivo e chame search_market_items. "
            "Use somente os dados devolvidos pela ferramenta; não invente produtos, "
            "lojas, preços ou disponibilidade. Se a busca não trouxer resultados, diga "
            "isso claramente. Este teste só consulta o catálogo: não cria carrinho, "
            "não compra e não afirma que uma compra foi feita."
        ),
        tools=[search_market_items],
    )
    result = await Runner.run(agent, message)
    return str(result.final_output), tool_state["called"]
