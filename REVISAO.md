# Revisão do projeto Araguaia

- Unificada a loja com o administrador mais recente. A pasta original tinha o catálogo simples, sem essa área.
- Removida a duplicação dos seis produtos entre HTML e JavaScript. Os dados de exemplo agora ficam em catalogo.js.
- Retirados a venda avulsa e o segundo preço opcional. Preço, estoque e carrinho agora usam fardos fechados.
- Obrigatória a quantidade de unidades por fardo no cadastro.
- Totais do carrinho e do resumo calculados em centavos inteiros.
- Adicionada verificação para impedir que uma edição sobrescreva um catálogo alterado em outra aba.
- Mantida a inserção de nomes e descrições como texto, sem executar HTML digitado no administrador.
- Mantidos upload com limites de tipo/tamanho, confirmação de exclusão e validação de estoque.
- Incluídos atendimento por WhatsApp, perguntas frequentes, chave Pix copiável e resumo para conferir com o atendimento.
- Links de WhatsApp somente preparam a conversa: nenhum envio automático.

Verificação realizada: cadastro de fardos, preço por fardo, limite de estoque, persistência após recarregar, conversão do catálogo anterior, totais, cópia de chave, número/conteúdo do link de WhatsApp, ausência de recursos quebrados e apresentação no computador/celular.

Pendências para produção: autenticação e permissões reais, banco compartilhado, pedidos, estoque central, entrega/frete, confirmação bancária e definição/integração da carteira digital. Os preços e as imagens do catálogo ainda são ilustrativos.


## Atualização de pedidos
Adicionados finalização sem pagamento, baixa local de estoque e via em PDF. Consulte PEDIDOS.md para os limites e o fluxo.
