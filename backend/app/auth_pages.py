"""Confirmação de OAuth sem credenciais nem detalhes técnicos na interface."""

CONNECTED_PAGE = """<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Conta iFood conectada — CompletAI</title>
<style>
body{margin:0;background:#faf7f4;color:#242424;font:16px/1.6 system-ui,sans-serif;
min-height:100vh;display:grid;place-items:center;padding:24px;box-sizing:border-box}
main{max-width:440px;background:white;border:1px solid #e8e2dc;border-radius:24px;padding:32px}
.brand{color:#c91e2d;font-weight:750}h1{font-size:28px;line-height:1.25}
p{color:#606060}button{background:#c91e2d;color:white;border:0;border-radius:12px;
font:600 16px system-ui;padding:14px 20px;cursor:pointer;min-height:48px}
button:focus-visible{outline:3px solid #242424;outline-offset:4px}
</style></head><body><main>
<span class="brand">CompletAI</span><h1>Conta iFood conectada</h1>
<p>Volte para a aba da CompletAI. Sua conexão será reconhecida automaticamente
e seus ingredientes continuam lá.</p>
<button type="button" onclick="window.close()">Fechar esta aba</button>
<p>Se a aba não fechar, você pode fechá-la e voltar ao app manualmente.</p>
</main></body></html>"""
