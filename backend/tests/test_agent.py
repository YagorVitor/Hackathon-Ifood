"""Dados comerciais sintéticos; inputSchema obtido do MCP autenticado."""
import asyncio
import json
import os
import unittest
from pathlib import Path
from types import SimpleNamespace as NS
from unittest.mock import AsyncMock, patch

import httpx2
from agents.tool_context import ToolContext
from agents.agent_output import AgentOutputSchema
from fastapi import HTTPException
from jsonschema import Draft202012Validator
from pydantic import ValidationError

from app.agent import run_agent
from app.context import ConversationStore
from app.contracts import (AgentDraft, AgentEnvelope, AgentRequest, DeclaredTags,
    InventoryItem, Location, MealOption, ProductSelection, SearchCriteria, UserContext)
from app.main import app
from app.recommendations import build_refinements, finalize, observe_products, to_cents
from app import ifood_mcp

SCHEMA = json.loads((Path(__file__).parent / 'fixtures/search_offers_schema.json').read_text())

def catalogue(fee=4.5, second=False):
    rows = [dict(itemId='synthetic-item-1', itemName='Produto fictício', unitPrice=6.10,
        promotionalUnitPrice=4.99, merchant=dict(merchantId='synthetic-store',
        merchantName='Loja fictícia', deliveryMethod=dict(fee=fee)))]
    if second:
        rows.append({**rows[0], 'itemId':'synthetic-item-2', 'unitPrice':2.01, 'promotionalUnitPrice':None})
    return dict(tool='searchOffers', isError=False, result=dict(results=rows))

def draft(**kwargs):
    return AgentDraft(**{'mensagem':'Sugestão de preparo.', **kwargs})

def context(**kwargs):
    return UserContext(inventario_confirmado=[InventoryItem(nome='arroz')], **kwargs)

def meal():
    return MealOption(titulo='Preparo', estrategia='COMPLETE_WITH_MARKET', usa=['arroz'],
                      faltantes=['cebola'], justificativa='Completar o preparo.')

def choose(ref='offer_1', index=0, quantity=1):
    return ProductSelection(referencia=ref, faltante='cebola', opcao_indice=index, quantidade_embalagens=quantity)

class RulesTests(unittest.TestCase):
    def test_filters_are_schema_compatible_and_health_is_not_inferred(self):
        ctx=context(tags_declaradas=DeclaredTags(preferencias=['VEGETARIAN'], intolerancias=['Lactose'],
            alergias=['leite'],condicoes_saude=['DIABETES']),consentimento_dados_sensiveis=True,
            orcamento_centavos=3500,criterios_busca=SearchCriteria(preco_maximo_item_centavos=990))
        filters=build_refinements(ctx)
        self.assertEqual(filters['itemRestrictions'],['LAC_FREE','VEGETARIAN'])
        self.assertEqual(filters['maxItemPrice'],9.9)
        args=dict(query='leite',merchantType='GROCERIES',resultKind='ITEM',
            userLocation=dict(latitude=0,longitude=0),refinements=filters)
        self.assertTrue(Draft202012Validator(SCHEMA).is_valid(args))
        allergy=context(tags_declaradas=DeclaredTags(alergias=['leite']),consentimento_dados_sensiveis=True)
        self.assertNotIn('itemRestrictions',build_refinements(allergy))
        self.assertEqual(build_refinements(context(orcamento_centavos=0))['maxItemPrice'],0)

    def test_consent_coordinates_and_money_validation(self):
        for factory in [lambda: UserContext(tags_declaradas=DeclaredTags(condicoes_saude=['DIABETES'])),
            lambda: AgentRequest(message='oi',latitude=0),
            lambda: AgentRequest(message='oi',session_id='a'*32),
            lambda: Location(latitude=float('nan'),longitude=0),
            lambda: SearchCriteria(preco_maximo_item_centavos=1.5)]:
            with self.assertRaises(ValidationError): factory()

    def test_decimal_prices_promotion_and_zero_freight(self):
        self.assertEqual(to_cents(0.1),10)
        self.assertEqual(to_cents('4.995'),500)
        for value in [-1,True,'NaN',float('inf'),'invalid']:
            self.assertIsNone(to_cents(value))
        products,error=observe_products(catalogue(fee=0))
        self.assertIsNone(error)
        self.assertEqual(products[0].preco_observado_centavos,499)
        self.assertEqual(products[0].frete_observado_centavos,0)

    def test_text_json_inline_errors_and_empty_catalogue(self):
        response=catalogue()
        response['result']=[dict(type='text',text=json.dumps(response['result']))]
        self.assertEqual(len(observe_products(response)[0]),1)
        for value in [dict(errors=dict(code='FAIL')),dict(unexpected=[]),[dict(type='text',text='bad JSON')]]:
            products,error=observe_products(dict(isError=False,result=value))
            self.assertEqual(products,[])
            self.assertIsNotNone(error)
        self.assertEqual(observe_products(dict(isError=False,result=dict(results=[]))),([],None))

    def test_hallucinated_ids_and_duplicate_selections_are_removed(self):
        products,_=observe_products(catalogue())
        output=finalize(draft(opcoes=[meal()],selecoes=[choose(),choose('inventada'),choose()]),context(),products,[],[])
        self.assertEqual(len(output.produtos),1)
        self.assertEqual(output.produtos[0].item_id,'synthetic-item-1')
        self.assertTrue(any('descartada' in note for note in output.limitacoes))

    def test_costs_per_option_deduplicate_freight_and_never_claim_final_total(self):
        products,_=observe_products(catalogue(second=True))
        output=finalize(draft(opcoes=[meal(),meal()],selecoes=[choose(quantity=2),choose('offer_2'),choose(index=1)]),
            context(orcamento_centavos=1500),products,[],[])
        first,second=output.custos
        self.assertEqual(first.subtotal_conhecido_centavos,1199)
        self.assertEqual(first.taxas_conhecidas_centavos,450)
        self.assertEqual(first.total_conhecido_centavos,1649)
        self.assertEqual(first.orcamento_status,'over')
        self.assertEqual(second.total_conhecido_centavos,949)
        self.assertEqual(second.orcamento_status,'unknown_total')
        self.assertFalse(second.total_final)

    def test_confirmed_inventory_and_question_state(self):
        option=MealOption(titulo='Preparo',estrategia='USE_WHAT_I_HAVE',usa=['arroz','ovos'],
            faltantes=['arroz'],justificativa='Teste')
        output=finalize(draft(pergunta_tags=True,opcoes=[option]),context(),[],[],[])
        self.assertEqual(output.opcoes[0].usa,['arroz'])
        self.assertEqual(output.opcoes[0].faltantes,['ovos'])
        self.assertEqual(output.opcoes[0].estrategia,'COMPLETE_WITH_MARKET')
        self.assertTrue(output.pergunta_tags)
        for state in ['ASKED','ANSWERED','DECLINED']:
            self.assertFalse(finalize(draft(pergunta_tags=True),context(tags_declaradas=DeclaredTags(estado=state)),[],[],[]).pergunta_tags)

    def test_sdk_strict_output_schema(self):
        schema=AgentOutputSchema(AgentDraft).json_schema()
        self.assertFalse(schema['additionalProperties'])
        self.assertEqual(set(schema['required']),set(schema['properties']))

class AgentTests(unittest.IsolatedAsyncioTestCase):
    async def test_no_purchase_requires_no_ifood_token(self):
        token=AsyncMock(side_effect=AssertionError('OAuth must be lazy'))
        with patch('app.agent.Runner.run',new=AsyncMock(return_value=NS(final_output=draft()))):
            result=await run_agent(AgentEnvelope(mensagem_usuario='Só ideias'),mcp_url='https://example.invalid',get_access_token=token)
        self.assertFalse(result.mcp_called)
        token.assert_not_awaited()

    async def test_tool_filters_evidence_and_no_token_or_coordinates_in_prompt(self):
        async def fake(agent,prompt,**kwargs):
            self.assertNotIn('SECRET_TOKEN',prompt)
            self.assertNotIn('12.345678',prompt)
            self.assertTrue(kwargs['run_config'].tracing_disabled)
            self.assertFalse(agent.model_settings.store)
            self.assertEqual([t.name for t in agent.tools],['search_market_items'])
            reply=await agent.tools[0].on_invoke_tool(ToolContext(context=None,tool_name='search_market_items',tool_call_id='test',tool_arguments='{}'),'{"query":"cebola"}')
            self.assertEqual(json.loads(reply)['status'],'success')
            return NS(final_output=draft(opcoes=[meal()],selecoes=[choose()]))
        ctx=context(localizacao=Location(latitude=12.345678,longitude=0),tags_declaradas=DeclaredTags(preferencias=['VEGAN']))
        with patch('app.agent.Runner.run',side_effect=fake),patch('app.agent.ifood_mcp.search_groceries',new=AsyncMock(return_value=catalogue())) as search:
            result=await run_agent(AgentEnvelope(mensagem_usuario='Busque complemento',contexto=ctx),mcp_url='https://example.invalid',get_access_token=AsyncMock(return_value='SECRET_TOKEN'))
        self.assertTrue(result.mcp_called)
        self.assertEqual(search.await_args.kwargs['refinements']['itemRestrictions'],['VEGAN'])
        self.assertEqual(result.output.produtos[0].preco_observado_centavos,499)

    async def test_missing_location_does_not_call_mcp(self):
        async def fake(agent,prompt,**kwargs):
            text=await agent.tools[0].on_invoke_tool(ToolContext(context=None,tool_name='search_market_items',tool_call_id='test',tool_arguments='{}'),'{"query":"cebola"}')
            self.assertIn('MISSING_LOCATION',text)
            return NS(final_output=draft(mensagem='Informe a localização.'))
        token=AsyncMock()
        with patch('app.agent.Runner.run',side_effect=fake),patch('app.agent.ifood_mcp.search_groceries',new=AsyncMock()) as search:
            result=await run_agent(AgentEnvelope(mensagem_usuario='Busque'),mcp_url='https://example.invalid',get_access_token=token)
        self.assertFalse(result.mcp_called)
        token.assert_not_awaited()
        search.assert_not_awaited()

    async def test_parallel_invocations_respect_three_searches_and_cache(self):
        async def fake(agent,prompt,**kwargs):
            invoke=agent.tools[0].on_invoke_tool
            replies=await asyncio.gather(*(invoke(ToolContext(context=None,tool_name='search_market_items',tool_call_id='test',tool_arguments='{}'),json.dumps(dict(query=q)))
                for q in ['cebola','CEBOLA','tomate','cenoura','alho']))
            self.assertTrue(any('Limite' in text for text in replies))
            return NS(final_output=draft())
        with patch('app.agent.Runner.run',side_effect=fake),patch('app.agent.ifood_mcp.search_groceries',new=AsyncMock(return_value=catalogue())) as search:
            result=await run_agent(AgentEnvelope(mensagem_usuario='Busque',contexto=context(localizacao=Location(latitude=0,longitude=0))),mcp_url='https://example.invalid',get_access_token=AsyncMock(return_value='test'))
        self.assertEqual(search.await_count,3)
        self.assertEqual(len(result.output.buscas),3)

    async def test_auth_failure_is_not_empty_catalogue(self):
        async def fake(agent,prompt,**kwargs):
            await agent.tools[0].on_invoke_tool(ToolContext(context=None,tool_name='search_market_items',tool_call_id='test',tool_arguments='{}'),'{"query":"cebola"}')
            return NS(final_output=draft())
        with patch('app.agent.Runner.run',side_effect=fake):
            with self.assertRaises(HTTPException) as error:
                await run_agent(AgentEnvelope(mensagem_usuario='Busque',contexto=context(localizacao=Location(latitude=0,longitude=0))),mcp_url='https://example.invalid',get_access_token=AsyncMock(side_effect=HTTPException(401,'Autentique')))
        self.assertEqual(error.exception.status_code,401)

class APITests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.life=app.router.lifespan_context(app)
        await self.life.__aenter__()
        self.client=httpx2.AsyncClient(transport=httpx2.ASGITransport(app=app),base_url='http://test')
        self.key=patch.dict(os.environ,{'OPENAI_API_KEY':'fake-offline-key'})
        self.key.start()

    async def asyncTearDown(self):
        self.key.stop()
        await self.client.aclose()
        await self.life.__aexit__(None,None,None)

    async def test_session_remembers_tags_question_and_can_be_deleted(self):
        with patch('app.agent.Runner.run',new=AsyncMock(return_value=NS(final_output=draft(pergunta_tags=True)))):
            first=await self.client.post('/api/agent/message',json=dict(message='Jantar',remember_context=True,context=dict(orcamento_centavos=3500)))
            self.assertEqual(first.status_code,200,first.text)
            sid=first.json()['session_id']
            self.assertTrue(first.json()['data']['pergunta_tags'])
            second=await self.client.post('/agent/test',json=dict(message='Pode seguir',remember_context=True,session_id=sid))
            self.assertEqual(second.status_code,200,second.text)
            self.assertFalse(second.json()['data']['pergunta_tags'])
            self.assertEqual(app.state.conversations._sessions[sid].context.orcamento_centavos,3500)
            self.assertEqual(len(app.state.conversations._sessions[sid].history),4)
            self.assertEqual((await self.client.delete(f'/api/agent/sessions/{sid}')).status_code,200)
            missing=await self.client.post('/agent/test',json=dict(message='oi',remember_context=True,session_id=sid))
            self.assertEqual(missing.status_code,404)

    async def test_no_storage_by_default_and_sensitive_context_requires_consent(self):
        bad=await self.client.post('/agent/test',json=dict(message='Jantar',context=dict(tags_declaradas=dict(alergias=['amendoim']))))
        self.assertEqual(bad.status_code,422)
        with patch('app.agent.Runner.run',new=AsyncMock(return_value=NS(final_output=draft()))):
            response=await self.client.post('/agent/test',json=dict(message='Ideia'))
        self.assertEqual(response.status_code,200,response.text)
        self.assertIsNone(response.json()['session_id'])
        self.assertEqual(len(app.state.conversations._sessions),0)

    async def test_failed_run_rolls_back_and_expired_session_is_rejected(self):
        with patch('app.agent.Runner.run',new=AsyncMock(side_effect=RuntimeError('failure'))):
            response=await self.client.post('/agent/test',json=dict(message='Ideia',remember_context=True))
        self.assertEqual(response.status_code,502)
        self.assertEqual(len(app.state.conversations._sessions),0)
        store=ConversationStore()
        sid,envelope=store.prepare(AgentRequest(message='oi',remember_context=True))
        store.commit(sid,envelope,finalize(draft(),UserContext(),[],[],[]))
        store._sessions[sid].expires_at=0
        with self.assertRaises(HTTPException):
            store.prepare(AgentRequest(message='oi',remember_context=True,session_id=sid))

class MCPTests(unittest.IsolatedAsyncioTestCase):
    async def test_real_schema_is_validated_before_tool_call(self):
        client=AsyncMock()
        client.list_tools.return_value=NS(tools=[NS(name='searchOffers',input_schema=SCHEMA)])
        client.call_tool.return_value=NS(is_error=False,structured_content=dict(results=[]))
        manager=AsyncMock()
        manager.__aenter__.return_value=client
        with patch('app.ifood_mcp._connected_client',new=AsyncMock(return_value=(AsyncMock(),object()))),patch('app.ifood_mcp.Client',return_value=manager):
            await ifood_mcp.search_groceries(mcp_url='https://example.invalid',access_token='test',query='tomate',latitude=0,longitude=0,refinements=dict(itemRestrictions=['VEGAN']))
            self.assertEqual(client.call_tool.await_args.args[0],'searchOffers')
            self.assertEqual(client.call_tool.await_args.args[1]['merchantType'],'GROCERIES')
            with self.assertRaises(HTTPException):
                await ifood_mcp.search_groceries(mcp_url='https://example.invalid',access_token='test',query='tomate',latitude=0,longitude=0,refinements=dict(itemRestrictions=['INVENTED']))
        self.assertEqual(client.call_tool.await_count,1)


class RegressionTests(unittest.IsolatedAsyncioTestCase):
    async def test_failed_search_cannot_be_rewritten_as_empty_catalogue(self):
        from app.contracts import SearchEvidence
        search=SearchEvidence(query='tomate',restricoes_aplicadas=[],status='error',quantidade_resultados=0)
        result=finalize(draft(mensagem='Não há produtos no catálogo.'),context(),[],[search],[])
        self.assertIn('Não foi possível concluir',result.mensagem)
        self.assertNotIn('Não há produtos',result.mensagem)

    async def test_only_transport_failures_are_retried_once(self):
        failure=HTTPException(502,'Falha de transporte')
        failure.__cause__=httpx2.ConnectError('synthetic test transport')
        with patch('app.ifood_mcp._search_groceries_once',new=AsyncMock(side_effect=[failure,catalogue()])) as read:
            result=await ifood_mcp.search_groceries(mcp_url='https://example.invalid',access_token='test',query='tomate',latitude=0,longitude=0)
            self.assertFalse(result['isError'])
            self.assertEqual(read.await_count,2)
        with patch('app.ifood_mcp._search_groceries_once',new=AsyncMock(side_effect=HTTPException(502,'Schema inválido'))) as read:
            with self.assertRaises(HTTPException): await ifood_mcp.search_groceries(mcp_url='https://example.invalid',access_token='test',query='tomate',latitude=0,longitude=0)
            self.assertEqual(read.await_count,1)

    async def test_revocation_clears_sensitive_history_before_next_model_run(self):
        store=ConversationStore()
        ctx=UserContext(tags_declaradas=DeclaredTags(condicoes_saude=['DIABETES']),consentimento_dados_sensiveis=True)
        sid,envelope=store.prepare(AgentRequest(message='Contexto sensível autorizado',remember_context=True,context=ctx))
        store.commit(sid,envelope,finalize(draft(),ctx,[],[],[]))
        _,next_envelope=store.prepare(AgentRequest(message='Retirar consentimento',remember_context=True,session_id=sid,context=UserContext()))
        self.assertEqual(next_envelope.historico_resumido,[])
        self.assertEqual(store._sessions[sid].history,[])
        self.assertFalse(store._sessions[sid].context.consentimento_dados_sensiveis)

if __name__=='__main__': unittest.main()
