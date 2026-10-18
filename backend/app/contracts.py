"""Contratos locais: contexto declarado, saída do modelo e evidências comerciais."""

from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

ItemRestriction = Literal["VEGETARIAN", "VEGAN", "LAC_FREE", "GLUTEN_FREE", "SUGAR_FREE", "ORGANIC"]
ShortText = Annotated[str, Field(min_length=1, max_length=160, strip_whitespace=True)]
Cents = Annotated[int, Field(ge=0, le=100_000_000, strict=True)]


class Contract(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Location(Contract):
    latitude: float = Field(ge=-90, le=90, allow_inf_nan=False)
    longitude: float = Field(ge=-180, le=180, allow_inf_nan=False)


class DeclaredTags(Contract):
    preferencias: list[Literal["VEGETARIAN", "VEGAN", "ORGANIC"]] = Field(
        default_factory=list, max_length=3
    )
    alergias: list[ShortText] = Field(default_factory=list, max_length=20)
    intolerancias: list[ShortText] = Field(default_factory=list, max_length=20)
    condicoes_saude: list[ShortText] = Field(default_factory=list, max_length=20)
    estado: Literal["NOT_ASKED", "ASKED", "ANSWERED", "DECLINED"] = "NOT_ASKED"


class InventoryItem(Contract):
    nome: ShortText
    quantidade: Decimal | None = Field(default=None, gt=0, allow_inf_nan=False)
    unidade: ShortText | None = None
    origem: Literal["DECLARED", "INFERRED"] = "DECLARED"
    confirmado: bool = True


class SearchCriteria(Contract):
    restricoes_itens: list[ItemRestriction] = Field(default_factory=list, max_length=6)
    preco_maximo_item_centavos: Cents | None = None
    frete_maximo_centavos: Cents | None = None
    ordenar_por: Literal["RELEVANCE", "PRICE", "DELIVERY_FEE", "DELIVERY_TIME", "DISTANCE"] = (
        "RELEVANCE"
    )


class UserContext(Contract):
    idioma_resposta: Literal["pt-BR", "en"] = "pt-BR"
    tags_declaradas: DeclaredTags = Field(default_factory=DeclaredTags)
    inventario_confirmado: list[InventoryItem] = Field(default_factory=list, max_length=80)
    objetivo: ShortText | None = None
    pessoas: int | None = Field(default=None, ge=1, le=100)
    tempo_min: int | None = Field(default=None, ge=1, le=1440)
    orcamento_centavos: Cents | None = None
    localizacao: Location | None = None
    criterios_busca: SearchCriteria = Field(default_factory=SearchCriteria)
    consentimento_dados_sensiveis: bool = False

    @model_validator(mode="after")
    def sensitive_consent(self):
        tags = self.tags_declaradas
        if (
            tags.alergias or tags.intolerancias or tags.condicoes_saude
        ) and not self.consentimento_dados_sensiveis:
            raise ValueError("Restrições sensíveis exigem consentimento_dados_sensiveis=true.")
        return self


class HistoryTurn(Contract):
    papel: Literal["usuario", "agente"]
    texto: str = Field(max_length=12000)


class AgentEnvelope(Contract):
    contract_version: Literal["1"] = "1"
    mensagem_usuario: str = Field(min_length=1, max_length=4000)
    contexto: UserContext = Field(default_factory=UserContext)
    historico_resumido: list[HistoryTurn] = Field(default_factory=list, max_length=12)


class AgentRequest(Contract):
    message: str = Field(min_length=1, max_length=4000)
    context: UserContext | None = None
    session_id: str | None = Field(default=None, pattern=r"^[A-Za-z0-9_-]{32}$")
    remember_context: bool = False
    latitude: float | None = Field(default=None, ge=-90, le=90, allow_inf_nan=False)
    longitude: float | None = Field(default=None, ge=-180, le=180, allow_inf_nan=False)

    @model_validator(mode="after")
    def valid_request(self):
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("Informe latitude e longitude juntas.")
        if self.session_id and not self.remember_context:
            raise ValueError("Continuar uma sessão exige remember_context=true.")
        return self


class RecognizedIngredient(Contract):
    nome: ShortText
    quantidade: Decimal | None = Field(default=None, gt=0, allow_inf_nan=False)
    unidade: ShortText | None = None
    provenance: Literal["INFERRED"] = "INFERRED"
    confirmado: Literal[False] = False


class RecognizedContext(Contract):
    """Detalhes extraídos do texto, sujeitos à revisão antes de virar contexto."""

    objetivo: ShortText | None = None
    pessoas: int | None = Field(default=None, ge=1, le=100)
    tempo_min: int | None = Field(default=None, ge=1, le=1440)
    orcamento_centavos: Cents | None = None
    provenance: Literal["INFERRED"] = "INFERRED"
    confirmado: Literal[False] = False


class OptionalComplement(Contract):
    nome: ShortText
    justificativa: str = Field(max_length=500)
    provenance: Literal["INFERRED"] = "INFERRED"


class IngredientRequirement(Contract):
    nome: ShortText
    quantidade: Decimal = Field(gt=0, allow_inf_nan=False)
    unidade: ShortText


class MealOption(Contract):
    titulo: ShortText
    estrategia: Literal["USE_WHAT_I_HAVE", "COMPLETE_WITH_MARKET", "CONVENIENCE"]
    necessidades_quantidade: list[IngredientRequirement] = Field(
        default_factory=list, max_length=80
    )
    usa: list[ShortText] = Field(default_factory=list, max_length=80)
    faltantes: list[ShortText] = Field(default_factory=list, max_length=30)
    justificativa: str = Field(max_length=1500)
    complementos_opcionais: list[OptionalComplement] = Field(default_factory=list, max_length=3)
    provenance: Literal["INFERRED"] = "INFERRED"


class PlannedMealOption(MealOption):
    """A IA deve sempre oferecer ao menos um complemento; as regras podem descartá-lo."""

    complementos_opcionais: list[OptionalComplement] = Field(min_length=1, max_length=3)


class ProductSelection(Contract):
    referencia: str = Field(max_length=40)
    faltante: ShortText
    opcao_indice: int = Field(ge=0, le=2)
    quantidade_embalagens: int = Field(default=1, ge=1, le=100)


class AgentDraft(Contract):
    """O modelo escolhe referências; não fornece nomes, IDs, preços ou totais."""

    mensagem: str = Field(max_length=3000)
    pergunta_tags: bool = False
    contexto_reconhecido: RecognizedContext = Field(default_factory=RecognizedContext)
    ingredientes_reconhecidos: list[RecognizedIngredient] = Field(
        default_factory=list, max_length=80
    )
    opcoes: list[PlannedMealOption] = Field(default_factory=list, max_length=3)
    selecoes: list[ProductSelection] = Field(default_factory=list, max_length=15)
    limitacoes: list[str] = Field(default_factory=list, max_length=20)


class ObservedProduct(Contract):
    referencia: str
    item_id: str
    merchant_id: str
    nome_observado: str
    loja_observada: str | None = None
    preco_observado_centavos: Cents | None = None
    frete_observado_centavos: Cents | None = None
    minimo_pedido_centavos: Cents | None = None
    provenance: Literal["MCP"] = "MCP"


class SelectedProduct(ObservedProduct):
    faltante: str
    opcao_indice: int
    quantidade_embalagens: int
    quantidade_provenance: Literal["INFERRED"] = "INFERRED"
    quantidade_confirmada: Literal[False] = False


class CostSummary(Contract):
    opcao_indice: int
    subtotal_conhecido_centavos: int
    taxas_conhecidas_centavos: int
    total_conhecido_centavos: int
    precos_completos: bool
    fretes_completos: bool
    total_final: Literal[False] = False
    provenance: Literal["ESTIMATED"] = "ESTIMATED"
    orcamento_status: Literal["over", "unknown_total", "not_applicable"]


class SearchEvidence(Contract):
    vertical: (
        Literal["RESTAURANT", "GROCERIES", "LIQUORSTORE", "DRUGSTORE", "PETSTORE", "SHOPPING"]
        | None
    ) = None
    query: str
    restricoes_aplicadas: list[ItemRestriction]
    status: Literal["success", "empty", "error"]
    quantidade_resultados: int


class AgentOutput(Contract):
    contract_version: Literal["1"] = "1"
    mensagem: str
    pergunta_tags: bool
    contexto_reconhecido: RecognizedContext = Field(default_factory=RecognizedContext)
    ingredientes_reconhecidos: list[RecognizedIngredient]
    opcoes: list[MealOption]
    produtos: list[SelectedProduct]
    limitacoes: list[str]
    buscas: list[SearchEvidence]
    custos: list[CostSummary] = Field(default_factory=list)


class AgentResponse(Contract):
    response: str
    mcpToolCalled: bool
    tool: Literal["searchOffers"] | None
    session_id: str | None
    data: AgentOutput


McpId = Annotated[str, Field(min_length=1, max_length=300)]
Token = Annotated[str, Field(pattern=r"^[A-Za-z0-9_-]{32}$")]


class Address(Contract):
    """Endereço salvo na conta iFood (listAddresses); exigido por createCart."""

    id: str
    rotulo: str | None = None
    endereco: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    ultimo_usado: bool = False
    provenance: Literal["MCP"] = "MCP"


class CartLineRequest(Contract):
    item_id: McpId
    quantidade: int = Field(ge=1, le=100)


class CartProposalRequest(Contract):
    """Uma loja por carrinho: createCart exige um único estabelecimento."""

    merchant_id: McpId
    address_id: McpId
    linhas: list[CartLineRequest] = Field(min_length=1, max_length=15)


class CartLine(Contract):
    item_id: str
    nome: str
    preco_unitario_centavos: Cents | None
    quantidade: int
    subtotal_centavos: int | None
    quantidade_provenance: Literal["DECLARED"] = "DECLARED"
    provenance: Literal["MCP"] = "MCP"


class CartProposal(Contract):
    id: str
    merchant_id: str
    loja: str | None
    address_id: str
    linhas: list[CartLine]
    subtotal_conhecido_centavos: int
    precos_completos: bool
    frete_observado_centavos: Cents | None
    minimo_pedido_centavos: Cents | None
    snapshot_hash: str
    expira_em_segundos: int
    provenance: Literal["ESTIMATED"] = "ESTIMATED"


class CartConfirmRequest(Contract):
    proposal_id: Token
    snapshot_hash: str = Field(pattern=r"^[0-9a-f]{64}$")
    confirm: Literal[True]


class CartItemSnapshot(Contract):
    item_id: str | None = None
    nome: str | None = None
    quantidade: int | None = None
    preco_centavos: Cents | None = None


class CartTotals(Contract):
    subtotal_centavos: Cents | None = None
    entrega_centavos: Cents | None = None
    desconto_centavos: Cents | None = None
    total_centavos: Cents | None = None


class CartResult(Contract):
    """Totais vêm do iFood (getCart); o pedido não é enviado nesta versão."""

    cart_id: str
    app_deeplink: str | None = None
    verificacao: Literal["confirmed", "unverified", "mismatch"] = "unverified"
    proposal_id: str
    merchant_id: str
    loja: str | None
    itens: list[CartItemSnapshot]
    totais: CartTotals
    avisos: list[str]
    limitacoes: list[str]
    pedido_enviado: Literal[False] = False
    provenance: Literal["MCP"] = "MCP"
