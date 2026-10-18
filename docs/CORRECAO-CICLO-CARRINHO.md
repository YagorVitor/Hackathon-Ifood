# Correções de ciclo do carrinho e conexão

- Uma interrupção durante `createCart` deixa a proposta indeterminada e impede repetir a escrita. Uma interrupção de `getCart` após obter o identificador preserva o carrinho como não verificado; repetir a confirmação retorna esse resultado.
- Erros explícitos de negócio continuam permitindo revisar e tentar novamente. Não há retry automático de escrita.
- `/auth/status` retorna `connection_id` opaco quando autenticado. Esse identificador muda a cada login e reinício; não é token nem identidade pessoal. O frontend invalida endereços, ofertas, ferramentas e proposta quando ele muda. Respostas atrasadas da conexão anterior são descartadas.
- Durante a confirmação, Meu perfil fica desabilitado. Abrir o perfil fora de uma operação e cancelar retorna ao Mercado, onde o destino e a busca podem ser revalidados, em vez de uma etapa de carrinho sem dados.
- `necessidades_quantidade` descreve quantidades totais estimadas da receita. O backend só conserva reposição de ingrediente existente se as quantidades conhecidas demonstram déficit na mesma unidade normalizada. Não há conversão automática de unidades ou embalagens. Os contratos JSON foram atualizados.

## Validação local

Backend: `python -m unittest discover -s tests -q` dentro de backend.
Frontend: `npm run test:lifecycle`, `npm run test:accessibility`, `npm run test:profile` e `npm run build` dentro de frontend.
Os testes usam dados sintéticos; não criam carrinhos reais nem enviam pedidos.
