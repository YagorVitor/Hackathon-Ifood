"""Regras determinísticas: filtros, evidências de catálogo e custos em centavos."""

import json
import unicodedata
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any

from .contracts import AgentDraft, AgentOutput, CostSummary, ObservedProduct, SearchEvidence, SelectedProduct, UserContext


def normalized(value: str) -> str:
    return " ".join("".join(c for c in unicodedata.normalize("NFKD", value.casefold()) if not unicodedata.combining(c)).split())


def build_refinements(context: UserContext) -> dict[str, Any]:
    criteria = context.criterios_busca
    restrictions = set(context.tags_declaradas.preferencias) | set(criteria.restricoes_itens)
    if context.consentimento_dados_sensiveis:
        intolerances = {normalized(v) for v in context.tags_declaradas.intolerancias}
        if "lactose" in intolerances:
            restrictions.add("LAC_FREE")
        if "gluten" in intolerances:
            restrictions.add("GLUTEN_FREE")
    # Alergias/DIABETES não viram LAC_FREE/SUGAR_FREE automaticamente.
    result: dict[str, Any] = {"sort": criteria.ordenar_por}
    if restrictions:
        result["itemRestrictions"] = sorted(restrictions)
    limits = [v for v in (criteria.preco_maximo_item_centavos, context.orcamento_centavos) if v is not None]
    if limits:
        result["maxItemPrice"] = min(limits) / 100
    if criteria.frete_maximo_centavos is not None:
        result["maxDeliveryFee"] = criteria.frete_maximo_centavos / 100
    return result


def to_cents(value: Any) -> int | None:
    if value is None or isinstance(value, bool):
        return None
    try:
        amount = Decimal(str(value))
        if not amount.is_finite() or amount < 0 or amount > 1_000_000:
            return None
        return int((amount * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    except (ValueError, TypeError, InvalidOperation):
        return None


def catalogue_payload(payload: Any) -> dict[str, Any] | None:
    """Aceita structuredContent ou um bloco textual JSON do SDK oficial."""
    if isinstance(payload, dict):
        return payload
    if isinstance(payload, list):
        blocks = [v.get("text") for v in payload if isinstance(v, dict) and v.get("type") == "text"]
        if len(blocks) == 1 and isinstance(blocks[0], str):
            try:
                value = json.loads(blocks[0])
                return value if isinstance(value, dict) else None
            except ValueError:
                pass
    return None


def observe_products(response: dict[str, Any], start: int = 0) -> tuple[list[ObservedProduct], str | None]:
    payload = catalogue_payload(response.get("result"))
    if response.get("isError") or payload is None or payload.get("errors") or payload.get("error"):
        return [], "A busca falhou ou retornou um formato sem evidências de produtos utilizáveis."
    rows = payload.get("results")
    if not isinstance(rows, list):
        return [], "O catálogo não retornou uma lista de produtos reconhecível."
    products = []
    rejected = False
    for row in rows:
        if not isinstance(row, dict):
            rejected = True
            continue
        merchant = row.get("merchant")
        if not isinstance(merchant, dict):
            merchant = {}
        ids = (row.get("itemId"), merchant.get("merchantId"), row.get("itemName"))
        if not all(isinstance(v, str) and 0 < len(v) <= 300 for v in ids):
            rejected = True
            continue
        delivery = merchant.get("deliveryMethod")
        if not isinstance(delivery, dict):
            delivery = {}
        base = to_cents(row.get("unitPrice"))
        promo = to_cents(row.get("promotionalUnitPrice"))
        fee = to_cents(delivery.get("promotionalFee"))
        if fee is None:
            fee = to_cents(delivery.get("fee"))
        products.append(ObservedProduct(
            referencia=f"offer_{start + len(products) + 1}", item_id=ids[0], merchant_id=ids[1],
            nome_observado=ids[2],
            loja_observada=merchant.get("merchantName") if isinstance(merchant.get("merchantName"), str) else None,
            preco_observado_centavos=promo if promo is not None and (base is None or promo <= base) else base,
            frete_observado_centavos=fee,
            minimo_pedido_centavos=to_cents(merchant.get("minimumOrderAmount")),
        ))
    return products, "Resultados sem identificação utilizável foram descartados." if rejected else None


def calculate_costs(products: list[SelectedProduct], context: UserContext, option_index: int) -> CostSummary:
    lines = [p for p in products if p.opcao_indice == option_index]
    subtotal = sum((p.preco_observado_centavos or 0) * p.quantidade_embalagens for p in lines)
    by_merchant: dict[str, list[SelectedProduct]] = {}
    for product in lines:
        by_merchant.setdefault(product.merchant_id, []).append(product)
    # Frete observado é contado uma vez por loja; só se todos os snapshots concordam.
    fees = []
    for group in by_merchant.values():
        observed = {p.frete_observado_centavos for p in group}
        fees.append(next(iter(observed)) if len(observed) == 1 and None not in observed else None)
    known_fees = sum(v for v in fees if v is not None)
    total = subtotal + known_fees
    status = "not_applicable" if context.orcamento_centavos is None else "unknown_total"
    if context.orcamento_centavos is not None and total > context.orcamento_centavos:
        status = "over"
    return CostSummary(
        opcao_indice=option_index, subtotal_conhecido_centavos=subtotal,
        taxas_conhecidas_centavos=known_fees, total_conhecido_centavos=total,
        precos_completos=bool(lines) and all(p.preco_observado_centavos is not None for p in lines),
        fretes_completos=bool(lines) and all(v is not None for v in fees), orcamento_status=status,
    )


def finalize(draft: AgentDraft, context: UserContext, observed: list[ObservedProduct], searches: list[SearchEvidence], notes: list[str]) -> AgentOutput:
    limitations = list(dict.fromkeys(notes + draft.limitacoes))
    options = [option.model_copy(deep=True) for option in draft.opcoes]
    inventory = {normalized(v.nome) for v in context.inventario_confirmado if v.confirmado}
    for option in options:
        unknown = [name for name in option.usa if normalized(name) not in inventory]
        if unknown:
            limitations.append("Ingredientes ainda não confirmados foram tratados como faltantes.")
        option.usa = [name for name in option.usa if normalized(name) in inventory]
        option.faltantes = list(dict.fromkeys(name for name in option.faltantes + unknown if normalized(name) not in inventory))
        if option.estrategia == "USE_WHAT_I_HAVE" and option.faltantes:
            option.estrategia = "COMPLETE_WITH_MARKET"
    registry = {p.referencia: p for p in observed}
    products = []
    seen = set()
    for choice in draft.selecoes:
        product = registry.get(choice.referencia)
        key = (choice.opcao_indice, product.merchant_id, product.item_id) if product else None
        if (product is None or choice.opcao_indice >= len(options)
                or normalized(choice.faltante) not in {normalized(n) for n in options[choice.opcao_indice].faltantes}
                or key in seen):
            limitations.append("Seleção sem evidência ou sem vínculo com um faltante foi descartada.")
            continue
        seen.add(key)
        products.append(SelectedProduct(**product.model_dump(), **choice.model_dump(exclude={"referencia"})))
    tags = context.tags_declaradas
    question = draft.pergunta_tags and tags.estado == "NOT_ASKED" and not (
        tags.preferencias or tags.alergias or tags.intolerancias or tags.condicoes_saude
    )
    message = draft.mensagem
    if searches and not products and all(s.status == "error" for s in searches):
        message = "Não foi possível concluir a consulta ao iFood. Tente novamente; nenhum produto foi confirmado."
    elif searches and not products and all(s.status == "empty" for s in searches):
        message = "Nenhum produto foi encontrado para os termos, critérios e localização consultados."
    if question:
        message += "\nVocê tem preferência vegetariana/vegana, alergia, intolerância ou restrição de saúde relevante, como diabetes? É opcional; pode pular."
    if tags.alergias or tags.intolerancias:
        limitations.append("Filtros de catálogo não confirmam composição nem ausência de contaminação cruzada; segurança para alergias permanece não verificada.")
    if tags.condicoes_saude:
        limitations.append("Condições de saúde não definem filtros automaticamente nem comprovam adequação clínica; informe critérios alimentares explícitos.")
    if products:
        limitations.append("Preços são observações do MCP nesta execução, não cotação final. Embalagem, quantidade necessária, taxas e mínimo de pedido precisam de revisão antes da compra.")
    costs = [calculate_costs(products, context, i) for i in range(len(options)) if any(p.opcao_indice == i for p in products)]
    return AgentOutput(
        mensagem=message, pergunta_tags=question,
        ingredientes_reconhecidos=draft.ingredientes_reconhecidos,
        contexto_reconhecido=draft.contexto_reconhecido, opcoes=options,
        produtos=products, buscas=searches, custos=costs,
        limitacoes=list(dict.fromkeys(limitations)),
    )
