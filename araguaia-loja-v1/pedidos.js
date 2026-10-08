// Demonstração local. Em produção, finalizar o pedido exige uma transação no servidor.
let finishingOrder=false,currentReceipt=null;
const orderDate=iso=>new Date(iso).toLocaleString('pt-BR');

function renderOrders(){
  for(const selector of ['#customer-orders','#admin-orders']){
    const list=$(selector);list.replaceChildren();
    if(!orders.length){list.append(el('p','empty-results','Nenhum pedido finalizado neste navegador.'));continue;}
    [...orders].reverse().forEach(o=>{
      const row=el('article','order-history-card'),info=el('div');
      info.append(el('strong','',o.id),el('p','',o.customer.name),el('small','',orderDate(o.createdAt)),el('span','status out','Aguardando pagamento'));
      const actions=el('div','order-history-actions'),view=el('button','secondary-button','Ver pedido / PDF');
      view.addEventListener('click',()=>{if($('#orders-dialog').open)$('#orders-dialog').close();showReceipt(o);});
      actions.append(el('b','',money(o.totalCents/100)),view);row.append(info,actions);list.append(row);
    });
  }
}

function showReceipt(o){
  currentReceipt=o;const content=$('#receipt-content');content.replaceChildren();
  const meta=el('div','receipt-meta');
  meta.append(el('strong','',o.id),el('p','',orderDate(o.createdAt)),el('span','status out','Aguardando pagamento'));
  content.append(meta,el('h3','receipt-customer',o.customer.name),el('p','receipt-phone',o.customer.phone));
  if(o.customer.notes)content.append(el('p','receipt-notes',o.customer.notes));
  o.items.forEach(i=>{
    const row=el('div','checkout-line'),info=el('div');
    info.append(el('strong','',i.name),el('small','',`${i.qty} fardo(s) · ${i.packQty} unidades de ${i.size} · ${money(i.unitCents/100)} por fardo`));
    row.append(info,el('b','',money(i.unitCents*i.qty/100)));content.append(row);
  });
  const total=el('div','cart-total');total.append(el('span','','Total dos produtos'),el('strong','',money(o.totalCents/100)));content.append(total,el('p','delivery-note','Frete não incluído. Estoque descontado no momento da finalização.'));
  const message=[`Olá! Finalizei o pedido ${o.id}.`,`Cliente: ${o.customer.name}`,`Telefone: ${o.customer.phone}`,`Data: ${orderDate(o.createdAt)}`,
    ...o.items.map(i=>`${i.qty} fardo(s) de ${i.name} (${i.packQty} un. de ${i.size}): ${money(i.unitCents*i.qty/100)}`),
    `Total dos produtos: ${money(o.totalCents/100)}. Frete não incluído.`,`Status: aguardando pagamento.`,o.customer.notes?`Observações: ${o.customer.notes}`:'',
    'Pedido de demonstração, salvo neste navegador. Por favor, conferir os valores, a disponibilidade e a entrega.'].filter(Boolean).join('\n');
  $('#receipt-whatsapp').href=`https://wa.me/${SUPPORT}?text=${encodeURIComponent(message)}`;
  $('#pdf-feedback').textContent='Seu pedido foi salvo. Você pode baixar a via em PDF novamente a qualquer momento pelo histórico.';
  $('#receipt-dialog').showModal();
}

async function downloadReceipt(o){
  const button=$('#download-receipt');button.disabled=true;$('#pdf-feedback').textContent='Preparando seu PDF…';
  try{
    const bytes=await window.AraguaiaPDF.create(o);
    const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'})),a=el('a');
    a.href=url;a.download=`pedido-${o.id}.pdf`;document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
    $('#pdf-feedback').textContent='PDF gerado. Se o download não aparecer, clique em “Baixar PDF do pedido”.';
  }catch{
    $('#pdf-feedback').textContent='O pedido está salvo, mas não foi possível gerar o PDF. Tente baixar novamente. Não finalize outro pedido para obter a via.';
  }finally{button.disabled=false;}
}
function checkoutError(message){$('#checkout-error').textContent=message;$('#checkout-error').hidden=false;}

async function finishOrder(event){
  event.preventDefault();if(finishingOrder)return;
  const form=$('#checkout-form');if(!form.reportValidity())return;
  const customer={name:$('#order-name').value.trim(),phone:$('#order-phone').value.replace(/\D/g,''),notes:$('#order-notes').value.trim()};
  if(customer.name.length<2||!/^\d{10,11}$/.test(customer.phone)){
    checkoutError('Informe seu nome e um telefone válido com DDD (10 ou 11 dígitos).');return;
  }
  finishingOrder=true;$('#finish-order').disabled=true;$('#finish-order').textContent='Finalizando…';$('#checkout-error').hidden=true;
  try{
    const finalize=()=>{
      // A leitura e a gravação devem ocorrer dentro do mesmo bloqueio entre abas.
      if(storageBroken||localStorage.getItem(STATE_KEY)!==storageSnapshot)throw Error('Os dados locais mudaram ou estão indisponíveis. Recarregue a página e revise o carrinho antes de finalizar.');
      if(!cart.length)throw Error('Seu carrinho está vazio.');
      if(orders.length>=1000)throw Error('O histórico local chegou ao limite de 1.000 pedidos. Exporte os pedidos e contate o suporte.');
      const seen=new Set();
      const items=cart.map(l=>{
        const p=get(l.id);
        if(!p||!p.active||!valid(p)||seen.has(l.id)||!Number.isInteger(l.qty)||l.qty<1||l.qty>p.stock)throw Error('Algum produto não tem estoque suficiente. Recarregue e revise o carrinho.');
        seen.add(l.id);return {id:p.id,name:p.name,size:p.size,packQty:p.packQty,qty:l.qty,unitCents:Math.round(p.price*100)};
      });
      const order={id:`ARG-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0,8).toUpperCase()}`,createdAt:new Date().toISOString(),customer,items,paymentStatus:'pending',totalCents:items.reduce((n,i)=>n+i.unitCents*i.qty,0)};
      if(!validOrder(order))throw Error('Não foi possível validar o pedido. Confira os dados.');
      const qtyById=new Map(items.map(i=>[i.id,i.qty]));
      const next=products.map(p=>qtyById.has(p.id)?{...p,stock:p.stock-qtyById.get(p.id)}:p);
      // Uma única gravação salva o pedido, baixa o estoque e esvazia o carrinho.
      if(!commit(next,[...orders,order],[]))throw Error('Não foi possível salvar o pedido. Nenhum estoque foi descontado. Confira o espaço disponível no navegador e tente novamente.');
      return order;
    };
    const order=navigator.locks?await navigator.locks.request('araguaia-finalizar-pedido',finalize):finalize();
    renderStore();renderAdmin();renderCart();renderOrders();form.reset();$('#checkout-dialog').close();
    showReceipt(order);notify('Pedido finalizado. Pagamento pendente e estoque atualizado.');
    await downloadReceipt(order);
  }catch(error){checkoutError(error.message||'Não foi possível finalizar o pedido. Tente novamente.');}
  finally{finishingOrder=false;$('#finish-order').disabled=false;$('#finish-order').textContent='Finalizar pedido sem pagamento';}
}
$('#checkout-form').addEventListener('submit',finishOrder);
$('#checkout-dialog').addEventListener('cancel',e=>{if(finishingOrder)e.preventDefault();});
$('#download-receipt').addEventListener('click',()=>{if(currentReceipt)downloadReceipt(currentReceipt);});
$('#close-receipt').addEventListener('click',()=>$('#receipt-dialog').close());
$('#open-orders').addEventListener('click',()=>{renderOrders();$('#orders-dialog').showModal();});
$('#close-orders').addEventListener('click',()=>$('#orders-dialog').close());
$('#export-orders').addEventListener('click',()=>{
  const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),orders},null,2)],{type:'application/json'}));
  const a=el('a');a.href=url;a.download='araguaia-pedidos.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
renderOrders();
