// Demonstração local. Em produção, autenticação, preços e estoque devem ser validados no servidor.
const $ = s => document.querySelector(s);
const money = n => n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const KEY='araguaia.catalog.v3', CART_KEY='araguaia.cart.v3';
const SUPPORT='5562984452600', PIX_KEY='6298610-9581';
const categories=['Cervejas','Refrigerantes','Águas','Energéticos','Sucos','Outros'];
const seeds=window.ARAGUAIA_CATALOGO;
function valid(p){return p&&typeof p.id==='string'&&p.id.length<100&&typeof p.name==='string'&&p.name.trim().length>0&&p.name.length<=80&&categories.includes(p.category)
  &&Number.isFinite(p.price)&&p.price>0&&p.price<=99999&&Number.isInteger(p.stock)&&p.stock>=0&&p.stock<=999999
  &&typeof p.size==='string'&&p.size.trim().length>0&&p.size.length<=40&&typeof p.description==='string'&&p.description.length<=180&&typeof p.active==='boolean'
  &&typeof p.image==='string'&&(p.image===''||/^data:image\/(png|jpeg|webp);base64,/.test(p.image))&&p.image.length<1500000
  &&Number.isInteger(p.sprite)&&p.sprite>=0&&p.sprite<=6
  &&(Number.isInteger(p.packQty)&&p.packQty>=2&&p.packQty<=1000||!p.active&&p.packQty===0);}
let products=structuredClone(seeds),cart=[],category='Todos',editingId=null,pendingDelete=null,draftImage='',draftSprite=0,imageLoading=false,toastTimer;
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function notify(text){const n=$('#toast');n.textContent=text;n.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>n.classList.remove('visible'),3200);}
try{const raw=localStorage.getItem(KEY);if(raw!==null){const p=JSON.parse(raw);if(!Array.isArray(p)||p.length>500||!p.every(valid)||new Set(p.map(v=>v.id)).size!==p.length)throw Error();products=p;}}
catch{notify('Não foi possível recuperar o catálogo salvo. Exibindo exemplos nesta página.');}
try{const raw=JSON.parse(localStorage.getItem(CART_KEY)||'[]');if(Array.isArray(raw))cart=raw.filter(l=>l&&typeof l.id==='string'&&l.type==='pack'&&Number.isInteger(l.qty)&&l.qty>0).slice(0,1000);}
catch{notify('O navegador não permitiu recuperar o carrinho.');}

try{if(localStorage.getItem(KEY)===null){const old=JSON.parse(localStorage.getItem('araguaia.catalog.v2')||'null');if(Array.isArray(old)){
  const migrated=old.map(p=>{const qty=Number.isInteger(p.packQty)&&p.packQty>=2?p.packQty:0;return {...p,price:qty&&p.packPrice>0?p.packPrice:p.price,stock:qty?Math.floor(p.stock/qty):0,packQty:qty,active:qty?!!p.active:false};}).map(({packPrice,...p})=>p);
  if(migrated.every(valid)&&new Set(migrated.map(p=>p.id)).size===migrated.length){const data=JSON.stringify(migrated);localStorage.setItem(KEY,data);products=migrated;notify('Catálogo convertido para fardos. Produtos sem embalagem definida ficam ocultos para revisão.');}
}}}catch{notify('Não foi possível converter o catálogo anterior. Ele foi preservado no navegador.');}
let storageSnapshot;try{storageSnapshot=localStorage.getItem(KEY);}catch{storageSnapshot=null;}
function commit(next){try{if(localStorage.getItem(KEY)!==storageSnapshot){notify('Catálogo alterado em outra aba. Recarregue para evitar perder alterações.');return false;}const json=JSON.stringify(next);localStorage.setItem(KEY,json);storageSnapshot=json;products=next;return true;}catch{return false;}}
function saveCart(){try{localStorage.setItem(CART_KEY,JSON.stringify(cart));}catch{notify('Carrinho atualizado nesta página, mas não foi possível salvá-lo no navegador.');}}
const get=id=>products.find(p=>p.id===id);
function reserved(id){return cart.filter(l=>l.id===id).reduce((n,l)=>n+l.qty,0);}
function reconcile(){const used=new Map();cart=cart.filter(l=>{const p=get(l.id);if(!p||!p.active||l.type==='pack'&&!p.packQty)return false;const q=1;l.qty=Math.min(l.qty,Math.floor(Math.max(0,p.stock-(used.get(p.id)||0))/q));used.set(p.id,(used.get(p.id)||0)+q*l.qty);return l.qty>0;});}
function photo(p){
  if(p.image){const img=el('img','product-photo uploaded-photo');img.src=p.image;img.alt=p.name;img.loading='lazy';return img;}
  if(p.sprite){const img=el('div',`product-photo photo-${p.sprite}`);img.setAttribute('role','img');img.setAttribute('aria-label',p.name);return img;}
  return el('div','product-photo no-photo','Foto em breve');
}
function card(p,preview=false){
  const n=el('article','product-card');Object.assign(n.dataset,{id:p.id,category:p.category,price:p.price});
  n.append(el('span','tag'+(!p.stock?' neutral':''),!p.stock?'ESGOTADO':'FARDO FECHADO'),photo(p),el('p','product-category',p.category.toUpperCase()),el('h3','',p.name),el('p','size',p.size+' · '+p.packQty+' unidades por fardo'));
  if(p.description)n.append(el('p','product-description',p.description));
  n.append(el('div','price',money(p.price)),el('p','pack-price-label','por fardo fechado'));
  const pack=el('p','wholesale',p.packQty+' unidades de '+p.size);pack.append(el('small','',p.packQty?money(p.price/p.packQty)+' por unidade · referência':'Defina a embalagem'));n.append(pack);
  const add=el('button','add-button',p.stock?'Adicionar 1 fardo':'Indisponível');add.dataset.add=p.id;add.disabled=preview||!p.stock;
  if(!preview)add.addEventListener('click',()=>addToCart(p.id));n.append(add);return n;
}
function renderStore(){
  const q=norm($('#search').value.trim()),sort=$('#sort').value;
  const list=products.filter(p=>p.active&&(category==='Todos'||p.category===category)&&norm(p.name+' '+p.category+' '+p.description).includes(q));
  if(sort!=='featured')list.sort((a,b)=>sort==='low'?a.price-b.price:b.price-a.price);
  $('#product-grid').replaceChildren(...list.map(p=>card(p)));$('#result-count').textContent=`${list.length} ${list.length===1?'produto para o seu pedido':'produtos para o seu pedido'}`;$('#empty-results').hidden=!!list.length;
  document.querySelectorAll('[data-category]:not(article)').forEach(b=>{const badge=b.querySelector('span');if(badge)badge.textContent=products.filter(p=>p.active&&(b.dataset.category==='Todos'||p.category===b.dataset.category)).length;b.classList.toggle('active',b.dataset.category===category);b.setAttribute('aria-pressed',String(b.dataset.category===category));});
}
for(const cat of categories)if(!document.querySelector(`.side-categories [data-category="${cat}"]`)){
  const b=el('button','',cat+' ');b.dataset.category=cat;b.append(el('span','','0'));$('.side-categories').append(b);
  const t=el('button','',cat);t.dataset.category=cat;$('.category-nav').insertBefore(t,$('.category-nav a'));
}
document.querySelectorAll('[data-category]:not(article)').forEach(b=>b.addEventListener('click',()=>{category=b.dataset.category;renderStore();$('#ofertas').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});}));
$('#search').addEventListener('input',renderStore);$('#sort').addEventListener('change',renderStore);
$('.search').addEventListener('submit',e=>{e.preventDefault();setMode(false);renderStore();$('#ofertas').scrollIntoView();});
function addToCart(id){const p=get(id);if(!p||!p.active||!p.packQty)return;if(reserved(id)+1>p.stock){notify('Quantidade de fardos indisponível no estoque.');return;}const line=cart.find(l=>l.id===id);if(line)line.qty++;else cart.push({id,type:'pack',qty:1});saveCart();renderCart();notify('1 fardo de '+p.name+' adicionado ao carrinho.');}
function renderCart(){
  reconcile();const list=$('#cart-items');list.replaceChildren();let total=0,count=0;if(!cart.length)list.append(el('p','','Seu carrinho está vazio. Escolha uma bebida para começar.'));
  cart.forEach(l=>{const p=get(l.id),price=p.price;total+=Math.round(price*100)*l.qty;count+=l.qty;
    const row=el('div','cart-line'),info=el('div');info.append(el('h3','',p.name),el('p','',`${p.packQty} unidades por fardo · ${money(price)} · Subtotal ${money(Math.round(price*100)*l.qty/100)}`));const controls=el('div','quantity');
    for(const change of [-1,1]){const b=el('button','',change<0?'−':'+');b.setAttribute('aria-label',`${change<0?'Diminuir':'Aumentar'} quantidade de ${p.name}`);if(change>0){controls.append(el('span','',l.qty));b.disabled=reserved(p.id)+1>p.stock;}
      b.addEventListener('click',()=>{if(change>0&&reserved(p.id)+1>p.stock){notify('Limite de estoque atingido.');return;}l.qty+=change;if(l.qty<=0)cart=cart.filter(v=>v!==l);saveCart();renderCart();});controls.append(b);}
    row.append(info,controls);list.append(row);
  });$('#cart-count').textContent=`${count} ${count===1?'fardo':'fardos'}`;$('#cart-badge').textContent=count;$('#cart-total').textContent=money(total/100);$('#review-order').disabled=!cart.length;
}
$('#open-cart').addEventListener('click',()=>{renderCart();$('#cart-dialog').showModal();});$('#close-cart').addEventListener('click',()=>$('#cart-dialog').close());$('#continue-shopping').addEventListener('click',()=>$('#cart-dialog').close());
function setMode(admin){$('#store-view').hidden=admin;$('#admin-view').hidden=!admin;$('.category-nav').hidden=admin;$('.support-section').hidden=admin;for(const [id,selected]of [['#admin-mode',admin],['#client-mode',!admin]]){$(id).classList.toggle('selected',selected);$(id).setAttribute('aria-pressed',String(selected));}if(admin)renderAdmin();}
$('#admin-mode').addEventListener('click',()=>setMode(true));$('#client-mode').addEventListener('click',()=>setMode(false));
function renderAdmin(){
  $('#stat-total').textContent=products.length;$('#stat-active').textContent=products.filter(p=>p.active).length;$('#stat-low').textContent=products.filter(p=>p.stock<=10).length;
  const q=norm($('#admin-search').value.trim()),list=products.filter(p=>norm(p.name+' '+p.category).includes(q)),body=$('#admin-table');body.replaceChildren();$('#admin-empty').hidden=!!list.length;
  list.forEach(p=>{const row=el('tr'),item=el('td'),product=el('div','table-product'),text=el('div');text.append(el('strong','',p.name),el('small','',p.category+' · '+p.packQty+' un. de '+p.size));product.append(photo(p),text);item.append(product);
    const price=el('td','',money(p.price));price.append(el('small','','por fardo fechado'));const stock=el('td',p.stock<=10?'low-stock':'',String(p.stock));stock.append(el('small','','fardos'));const status=el('td');status.append(el('span','status '+(!p.active?'muted':!p.stock?'out':'live'),!p.active?'Oculto':!p.stock?'Esgotado':'Na loja'));
    price.dataset.label='Preço';stock.dataset.label='Estoque';status.dataset.label='Situação';
    const actions=el('td'),buttons=el('div','row-actions'),edit=el('button','secondary-button','Editar'),remove=el('button','text-button delete-button','Excluir');edit.setAttribute('aria-label','Editar '+p.name);edit.addEventListener('click',()=>openEditor(p));remove.setAttribute('aria-label','Excluir '+p.name);remove.addEventListener('click',()=>{pendingDelete=p.id;$('#delete-message').textContent=`Deseja excluir “${p.name}”?`;$('#delete-dialog').showModal();});buttons.append(edit,remove);actions.append(buttons);row.append(item,price,stock,status,actions);body.append(row);
  });
}
$('#admin-search').addEventListener('input',renderAdmin);
function draft(){return{id:editingId||'preview',name:$('#product-name').value.trim(),category:$('#product-category').value,size:$('#product-size').value.trim(),price:Number($('#product-price').value),stock:Number($('#product-stock').value),packQty:Number($('#product-packqty').value),description:$('#product-description').value.trim(),active:$('#product-active').checked,image:draftImage,sprite:draftSprite};}
function updatePreview(){const p=draft();p.name=p.name||'Nome do produto';p.size=p.size||'Volume';$('#product-preview').replaceChildren(card(p,true));$('#remove-image').hidden=!draftImage&&!draftSprite;}
function openEditor(p=null){editingId=p?.id||null;draftImage=p?.image||'';draftSprite=p?.sprite||0;$('#product-form').reset();$('#product-dialog-title').textContent=p?'Editar produto':'Novo produto';$('#product-error').hidden=true;
  for(const key of ['name','category','size','price','stock','description'])$('#product-form').elements[key].value=p?p[key]:key==='stock'?0:key==='category'?'Cervejas':'';
  $('#product-packqty').value=p?.packQty||'';$('#product-active').checked=p?p.active:true;updatePreview();$('#product-dialog').showModal();$('#product-name').focus();}
function closeEditor(){if(!imageLoading)$('#product-dialog').close();}
$('#new-product').addEventListener('click',()=>openEditor());$('#close-product').addEventListener('click',closeEditor);$('#cancel-product').addEventListener('click',closeEditor);$('#product-dialog').addEventListener('cancel',e=>{if(imageLoading)e.preventDefault();});$('#product-form').addEventListener('input',updatePreview);
function error(text){$('#product-error').textContent=text;$('#product-error').hidden=false;}
$('#remove-image').addEventListener('click',()=>{draftImage='';draftSprite=0;$('#product-image').value='';updatePreview();});
$('#product-image').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;$('#product-error').hidden=true;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024){error('Escolha uma imagem PNG, JPG ou WebP de até 5 MB.');e.target.value='';return;}
  imageLoading=true;$('#save-product').disabled=true;$('#save-product').textContent='Preparando foto…';const url=URL.createObjectURL(file);
  try{const img=new Image();img.src=url;await img.decode();if(img.width*img.height>40000000)throw Error();const scale=Math.min(1,640/Math.max(img.width,img.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);draftImage=canvas.toDataURL('image/jpeg',.82);draftSprite=0;updatePreview();}
  catch{error('Não foi possível abrir essa foto. Tente outra imagem.');e.target.value='';}
  finally{URL.revokeObjectURL(url);imageLoading=false;$('#save-product').disabled=false;$('#save-product').textContent='Salvar produto';}
});
function refresh(){reconcile();saveCart();renderStore();renderAdmin();renderCart();}
$('#product-form').addEventListener('submit',e=>{
  e.preventDefault();if(imageLoading)return;const p=draft();p.id=editingId||crypto.randomUUID();
  if(p.packQty<2){error('Informe pelo menos 2 unidades por fardo fechado.');return;}
  if(!valid(p)){error('Confira nome, tamanho, valores e estoque. Use fardos inteiros, pelo menos 2 unidades por fardo e preços maiores que zero.');return;}
  const next=editingId?products.map(v=>v.id===editingId?p:v):[...products,p];if(next.length>500){error('Este protótipo suporta até 500 produtos.');return;}
  if(!commit(next)){error('Não foi possível salvar. O armazenamento local pode estar cheio. Exporte o catálogo e tente uma foto menor.');return;}
  refresh();$('#product-dialog').close();notify(editingId?'Produto atualizado.':'Produto cadastrado. Confira na loja do cliente.');
});
$('#cancel-delete').addEventListener('click',()=>$('#delete-dialog').close());$('#confirm-delete').addEventListener('click',()=>{if(!commit(products.filter(p=>p.id!==pendingDelete))){notify('Não foi possível salvar a exclusão.');return;}refresh();$('#delete-dialog').close();notify('Produto excluído.');});
$('#export-catalog').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({version:3,exportedAt:new Date().toISOString(),products},null,2)],{type:'application/json'}));const a=el('a');a.href=url;a.download='araguaia-catalogo.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
window.addEventListener('storage',e=>{if(e.key===KEY||e.key===CART_KEY)notify('Dados alterados em outra aba. Recarregue antes de continuar.');});
function checkout(){
  reconcile();renderCart();if(!cart.length)return;
  const summary=$('#checkout-summary');summary.replaceChildren();let cents=0;
  const lines=['Olá! Gostaria de conferir a disponibilidade e os valores deste pedido de fardos fechados:'];
  cart.forEach(l=>{const p=get(l.id),subtotal=Math.round(p.price*100)*l.qty;cents+=subtotal;
    const row=el('div','checkout-line'),info=el('div');info.append(el('strong','',p.name),el('small','',`${l.qty} ${l.qty===1?'fardo':'fardos'} · ${p.packQty} unidades de ${p.size}`));row.append(info,el('b','',money(subtotal/100)));summary.append(row);
    lines.push(`${l.qty} fardo(s) de ${p.name} (${p.packQty} unidades de ${p.size}): ${money(subtotal/100)}`);
  });
  $('#checkout-total').textContent=money(cents/100);
  lines.push(`Subtotal ilustrativo: ${money(cents/100)}.`,`Por favor, confirmar preços, estoque, entrega/retirada, frete e pagamento via Pix. Ainda não fiz pagamento.`);
  $('#order-whatsapp').href=`https://wa.me/${SUPPORT}?text=${encodeURIComponent(lines.join('\n'))}`;
  $('#cart-dialog').close();$('#checkout-dialog').showModal();
}
$('#review-order').addEventListener('click',checkout);
$('#close-checkout').addEventListener('click',()=>$('#checkout-dialog').close());
$('#copy-pix').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(PIX_KEY);notify('Chave Pix copiada. Confirme os dados com o atendimento.');}
  catch{const selection=window.getSelection(),range=document.createRange();range.selectNodeContents($('#pix-key'));selection.removeAllRanges();selection.addRange(range);notify('Chave selecionada. Use Copiar no seu dispositivo.');}
});
reconcile();renderStore();renderCart();renderAdmin();
