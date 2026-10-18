"""Carrinho determinístico: proposta → confirmação explícita → createCart → getCart.

O agente continua somente leitura. Só entram na proposta produtos observados no
MCP por uma busca recente; preços e totais finais vêm do getCart.
"""

import hashlib
import json
import re
import secrets
import time
from dataclasses import dataclass, field
from typing import Any, Literal

from fastapi import HTTPException

from .contracts import (Address, CartConfirmRequest, CartItemSnapshot, CartLine, CartProposal,
    CartProposalRequest, CartResult, CartTotals, ObservedProduct)
from .recommendations import catalogue_payload, to_cents

PROPOSAL_TTL_SECONDS = 600
EVIDENCE_TTL_SECONDS = 1800
ERROR_CODE = re.compile(r"^[A-Z][A-Z0-9_]{2,60}$")


@dataclass
class _Evidence:
    product: ObservedProduct
    expires_at: float


@dataclass
class _Proposal:
    data: CartProposal
    expires_at: float
    status: Literal["READY", "IN_PROGRESS", "CREATED"] = "READY"
    result: CartResult | None = None


@dataclass
class CartStore:
    """Estado local de um único usuário; métodos síncronos, sem await entre leitura e escrita."""
    _evidence: dict[tuple[str, str], _Evidence] = field(default_factory=dict)
    _proposals: dict[str, _Proposal] = field(default_factory=dict)

    def _expire(self, now: float):
        self._evidence = {k: v for k, v in self._evidence.items() if v.expires_at > now}
        self._proposals = {k: v for k, v in self._proposals.items() if v.expires_at > now or v.status != "READY"}

    def remember(self, products: list[ObservedProduct]):
        now = time.monotonic()
        self._expire(now)
        for product in products:
            # Só o snapshot do MCP: nome, preço e IDs não vêm do navegador.
            snapshot = ObservedProduct(**product.model_dump(include=set(ObservedProduct.model_fields)))
            self._evidence[(snapshot.merchant_id, snapshot.item_id)] = _Evidence(snapshot, now + EVIDENCE_TTL_SECONDS)

    def propose(self, request: CartProposalRequest) -> CartProposal:
        now = time.monotonic()
        self._expire(now)
        if len({line.item_id for line in request.linhas}) != len(request.linhas):
            raise HTTPException(422, "Cada produto deve aparecer uma única vez no carrinho.")
        lines, products = [], []
        for line in request.linhas:
            evidence = self._evidence.get((request.merchant_id, line.item_id))
            if evidence is None:
                raise HTTPException(409, "Há produtos sem evidência recente do iFood para esta loja. Consulte o Mercado de novo.")
            product = evidence.product
            products.append(product)
            price = product.preco_observado_centavos
            lines.append(CartLine(
                item_id=product.item_id, nome=product.nome_observado, preco_unitario_centavos=price,
                quantidade=line.quantidade, subtotal_centavos=None if price is None else price * line.quantidade,
            ))
        fees = {p.frete_observado_centavos for p in products}
        minimums = {p.minimo_pedido_centavos for p in products}
        snapshot = {
            "merchant_id": request.merchant_id, "address_id": request.address_id,
            "linhas": [line.model_dump(mode="json") for line in lines],
        }
        proposal = CartProposal(
            id=secrets.token_urlsafe(24), merchant_id=request.merchant_id,
            loja=products[0].loja_observada, address_id=request.address_id, linhas=lines,
            subtotal_conhecido_centavos=sum(line.subtotal_centavos or 0 for line in lines),
            precos_completos=all(line.subtotal_centavos is not None for line in lines),
            frete_observado_centavos=next(iter(fees)) if len(fees) == 1 else None,
            minimo_pedido_centavos=next(iter(minimums)) if len(minimums) == 1 else None,
            snapshot_hash=hashlib.sha256(json.dumps(snapshot, sort_keys=True).encode()).hexdigest(),
            expira_em_segundos=PROPOSAL_TTL_SECONDS,
        )
        self._proposals[proposal.id] = _Proposal(proposal, now + PROPOSAL_TTL_SECONDS)
        return proposal

    def begin(self, request: CartConfirmRequest) -> CartProposal | CartResult:
        """Autoriza createCart uma única vez por proposta; repetir devolve o mesmo carrinho."""
        self._expire(time.monotonic())
        entry = self._proposals.get(request.proposal_id)
        if entry is None:
            raise HTTPException(404, "Proposta inexistente ou expirada. Revise o carrinho de novo.")
        if entry.data.snapshot_hash != request.snapshot_hash:
            raise HTTPException(409, "A proposta mudou desde a revisão. Confira os itens antes de confirmar.")
        if entry.status == "CREATED" and entry.result is not None:
            return entry.result
        if entry.status == "IN_PROGRESS":
            raise HTTPException(409, "O carrinho já está sendo criado. Aguarde a resposta.")
        entry.status = "IN_PROGRESS"
        return entry.data

    def release(self, proposal_id: str):
        entry = self._proposals.get(proposal_id)
        if entry and entry.status == "IN_PROGRESS":
            entry.status = "READY"

    def finish(self, result: CartResult):
        entry = self._proposals[result.proposal_id]
        entry.status, entry.result = "CREATED", result


def _unwrap(response: dict[str, Any]) -> dict[str, Any]:
    """Cart usa `error` no envelope; HTTP 200 pode carregar erro de negócio."""
    payload = catalogue_payload(response.get("result"))
    if payload is not None:
        for key in ("cart", "data"):
            if isinstance(payload.get(key), dict) and len(payload) == 1:
                payload = payload[key]
    failure = payload is None or response.get("isError") or payload.get("error") or payload.get("errors")
    if failure:
        error = (payload or {}).get("error") or (payload or {}).get("errors")
        if isinstance(error, list) and error:
            error = error[0]
        code = error.get("code") if isinstance(error, dict) else None
        suffix = f" (código {code})" if isinstance(code, str) and ERROR_CODE.match(code) else ""
        raise HTTPException(502, f"O iFood recusou a operação {response.get('tool')}{suffix}. Nenhum pedido foi feito.")
    return payload


def _text(row: dict[str, Any], *keys: str) -> str | None:
    value = next((row[k] for k in keys if isinstance(row.get(k), str) and row[k].strip()), None)
    return value.strip()[:300] if value else None


def _money(row: dict[str, Any], *keys: str) -> int | None:
    for key in keys:
        value = row.get(key)
        if isinstance(value, dict):
            value = value.get("value", value.get("amount"))
        cents = to_cents(value)
        if cents is not None:
            return cents
    return None


def parse_addresses(response: dict[str, Any]) -> list[Address]:
    payload = _unwrap(response)
    rows = next((payload[k] for k in ("results", "addresses", "items") if isinstance(payload.get(k), list)), [])
    addresses = []
    for row in rows:
        if not isinstance(row, dict) or not (address_id := _text(row, "addressId", "id")):
            continue
        coordinates = row.get("coordinates") if isinstance(row.get("coordinates"), dict) else row
        lat, lng = coordinates.get("latitude"), coordinates.get("longitude")
        valid = all(isinstance(v, (int, float)) and not isinstance(v, bool) for v in (lat, lng))
        addresses.append(Address(
            id=address_id, rotulo=_text(row, "alias", "label"),
            endereco=_text(row, "formattedAddress", "address", "streetName"),
            latitude=lat if valid and abs(lat) <= 90 else None,
            longitude=lng if valid and abs(lng) <= 180 else None,
            ultimo_usado=row.get("isLastUsedAddress") is True,
        ))
    return addresses


def create_cart_arguments(proposal: CartProposal) -> list[dict[str, Any]]:
    """Variações aceitas conforme o schema anunciado (documentação cita options e customizations)."""
    items = [{"itemId": line.item_id, "quantity": line.quantidade} for line in proposal.linhas]
    base = {"merchantId": proposal.merchant_id, "addressId": proposal.address_id}
    return [
        {**base, "items": items},
        {**base, "items": [{**item, "options": []} for item in items]},
        {**base, "items": [{**item, "customizations": []} for item in items]},
    ]


def cart_id_of(response: dict[str, Any]) -> str:
    cart_id = _text(_unwrap(response), "cartId", "id")
    if cart_id is None:
        raise HTTPException(502, "O iFood não devolveu o identificador do carrinho. Confira o app antes de tentar de novo.")
    return cart_id


def build_result(proposal: CartProposal, cart_id: str, snapshot: dict[str, Any] | None, notes: list[str]) -> CartResult:
    payload = _unwrap(snapshot) if snapshot is not None else {}
    totals_row = next((payload[k] for k in ("totals", "totalizers", "summary", "prices") if isinstance(payload.get(k), dict)), payload)
    items = []
    for row in payload.get("items") or []:
        if not isinstance(row, dict):
            continue
        quantity = row.get("quantity")
        items.append(CartItemSnapshot(
            item_id=_text(row, "itemId", "id"), nome=_text(row, "name", "itemName", "description"),
            quantidade=quantity if isinstance(quantity, int) and not isinstance(quantity, bool) and 0 < quantity <= 1000 else None,
            preco_centavos=_money(row, "totalPrice", "price", "unitPrice"),
        ))
    totals = CartTotals(
        subtotal_centavos=_money(totals_row, "subtotal", "subTotal", "itemsTotal"),
        entrega_centavos=_money(totals_row, "deliveryFee", "delivery", "deliveryPrice"),
        desconto_centavos=_money(totals_row, "discount", "discounts", "totalDiscount"),
        total_centavos=_money(totals_row, "total", "totalPrice", "orderTotal"),
    )
    warnings = []
    for row in payload.get("warnings") or payload.get("validations") or []:
        message = row if isinstance(row, str) else row.get("message") if isinstance(row, dict) else None
        if isinstance(message, str) and 0 < len(message) <= 200:
            warnings.append(message)
    limitations = list(notes)
    if totals.subtotal_centavos is not None and totals.subtotal_centavos != proposal.subtotal_conhecido_centavos:
        limitations.append("O subtotal do iFood difere da estimativa da busca; vale o valor do carrinho.")
    if totals.total_centavos is None:
        limitations.append("O iFood não informou o total nesta resposta; confira no app antes de pagar.")
    limitations.append("Entrega, pagamento e envio do pedido não são feitos por esta versão.")
    return CartResult(
        cart_id=cart_id, proposal_id=proposal.id, merchant_id=proposal.merchant_id, loja=proposal.loja,
        itens=items, totais=totals, avisos=warnings, limitacoes=limitations,
    )
