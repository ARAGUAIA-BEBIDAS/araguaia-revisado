# Pedidos e via em PDF

## Como testar

1. Abra a loja em `araguaia-loja-v1/index.html` pelo Live Server ou pela hospedagem.
2. Adicione fardos ao carrinho e clique em **Revisar pedido e pagamento**.
3. Preencha nome e telefone com DDD. Observações de entrega ou retirada são opcionais.
4. Clique em **Finalizar pedido sem pagamento**.
5. O pedido fica **Aguardando pagamento**, o estoque dos fardos é descontado e o carrinho é esvaziado.
6. A via em PDF é gerada automaticamente. Se o navegador bloquear o download, clique em **Baixar PDF do pedido**.
7. Acesse **Meus pedidos** para consultar o histórico e baixar uma nova via.

O PDF tem número do pedido, nome, telefone, data e hora da finalização, observações, produtos, tamanho, unidades por fardo, quantidade de fardos, preço por fardo, subtotal e total. A via não é nota fiscal nem comprovante de pagamento. O frete não é incluído.

O administrador pode consultar os mesmos pedidos locais e exportar o histórico em JSON. Preços, nomes e embalagens ficam congelados no pedido: editar ou excluir um produto depois não altera a via já emitida. Baixar novamente não desconta estoque.

## Dados locais e limites

Esta implementação é uma demonstração para o projeto atual, que não tem servidor de pedidos ou banco de dados. Produtos, pedidos e carrinho são salvos juntos em uma única gravação no navegador, na chave `araguaia.store.v4`. Catálogo e carrinho v3 são importados no primeiro uso; as chaves anteriores são preservadas. A versão v4 passa a ser a fonte principal.

A finalização valida estoque e preço e impede cliques repetidos. Falhas ao salvar não criam o pedido nem descontam estoque. Alterações detectadas em outra aba exigem recarregar. Navegadores com Web Locks também serializam a finalização entre abas da mesma origem.

**Não há estoque compartilhado entre celulares, computadores ou clientes.** O histórico não identifica contas: qualquer pessoa que use este mesmo perfil de navegador pode vê-lo. Limpar os dados do navegador remove os pedidos; trocar o endereço ou o navegador não transfere o histórico. O administrador continua sem autenticação. Não há confirmação automática de Pix, envio automático de pedido ao atendimento, cancelamento com reposição de estoque ou integração fiscal.

O limite local é de 1.000 pedidos, sujeito ao espaço disponível no navegador. Exporte o histórico para manter uma cópia. A exportação não oferece restauração automática. O PDF é gerado localmente, sem enviar dados do cliente a outro serviço. Caracteres fora das fontes padrão do PDF são substituídos por `?`; acentos em português são suportados.

## Arquivos adicionados

- `pedidos.js`: finalização, histórico, consulta, exportação e download.
- `pedido-pdf.js`: apresentação e geração do PDF A4 com quebra automática de páginas.
- `vendor/pdf-lib.min.js`: biblioteca pdf-lib 1.17.1, armazenada no projeto, com licença MIT em `vendor/pdf-lib-LICENSE.md`.

Também foram atualizados `index.html`, `style.css` e `script.js` na pasta da loja. Não é preciso instalar pacotes para usar o site.

## Próxima etapa para vendas reais

Autenticar clientes e administrador, guardar os pedidos no servidor e realizar a criação do pedido e a baixa de estoque em uma transação no banco de dados. O servidor deve conferir preços e estoque e controlar pagamento, cancelamentos e permissões. A baixa no navegador não substitui essa operação central.

Para publicar esta atualização da demonstração, faça commit e push de todos os arquivos alterados e novos, incluindo a pasta `vendor`. Nenhum commit ou push foi feito automaticamente.

## Verificação

Testados no navegador: dados obrigatórios, finalização sem pagamento, clique repetido, baixa em fardos, limpeza do carrinho, histórico após recarregar, repetição de PDF sem nova baixa, manutenção dos valores originais após editar o catálogo, falha de armazenamento, aba desatualizada, migração de dados anteriores e apresentação no celular. Conferidos o texto e a apresentação de PDFs de uma e várias páginas.
