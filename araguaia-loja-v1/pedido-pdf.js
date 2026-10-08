// PDF gerado no próprio navegador com pdf-lib (MIT), incluído na pasta vendor.
window.AraguaiaPDF={async create(order){
  if(!window.PDFLib)throw Error('Biblioteca de PDF indisponível.');
  const {PDFDocument,StandardFonts,rgb}=window.PDFLib;
  const pdf=await PDFDocument.create(),regular=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  pdf.setTitle(`Pedido ${order.id} - Araguaia Bebidas`);pdf.setAuthor('Araguaia Bebidas Atacarejo');pdf.setCreationDate(new Date(order.createdAt));
  const ink=rgb(.07,.07,.07),gray=rgb(.36,.36,.36),yellow=rgb(.96,.93,0),pale=rgb(.96,.96,.94),white=rgb(1,1,1);
  const width=595.28,height=841.89,margin=40,right=width-margin;
  const money=n=>(n/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  // As fontes padrão suportam português. Caracteres fora do WinAnsi viram '?'.
  function safe(value){return Array.from(String(value).normalize('NFC')).map(c=>{if(c==='\n')return c;if(/[\u0000-\u001f\u007f]/.test(c))return ' ';try{regular.encodeText(c);return c;}catch{return '?';}}).join('');}
  function wrap(value,maxWidth,size=10,font=regular){
    const out=[];
    for(const paragraph of safe(value).split('\n')){
      let line='';
      for(const word of paragraph.split(/\s+/)){
        if(!word)continue;
        if(font.widthOfTextAtSize(line?line+' '+word:word,size)<=maxWidth){line=line?line+' '+word:word;continue;}
        if(line)out.push(line);line='';
        for(const c of word){if(font.widthOfTextAtSize(line+c,size)>maxWidth){out.push(line);line='';}line+=c;}
      }
      out.push(line);
    }
    return out;
  }
  let page,y;
  const text=(value,x,pos,size=10,font=regular,color=ink)=>page.drawText(safe(value),{x,y:pos,size,font,color});
  function newPage(){
    page=pdf.addPage([width,height]);
    page.drawRectangle({x:0,y:height-110,width,height:110,color:ink});
    page.drawRectangle({x:0,y:height-114,width,height:4,color:yellow});
    text('ARAGUAIA BEBIDAS',margin,height-48,23,bold,white);
    text('ATACAREJO  /  VIA DO PEDIDO',margin,height-71,10,bold,yellow);
    text(order.id,margin,height-94,9,regular,white);y=height-143;
  }
  function ensure(h){if(y-h<80)newPage();}
  function paragraph(value,{size=10,color=ink,font=regular,maxWidth=right-margin,gap=5}={}){
    for(const line of wrap(value,maxWidth,size,font)){ensure(size+5);text(line,margin,y,size,font,color);y-=size+5;}y-=gap;
  }
  function tableHeader(){
    ensure(32);page.drawRectangle({x:margin,y:y-12,width:right-margin,height:25,color:pale});
    text('PRODUTO / EMBALAGEM',margin+9,y-3,8,bold);text('FARDOS',330,y-3,8,bold);text('PREÇO',397,y-3,8,bold);text('SUBTOTAL',473,y-3,8,bold);y-=36;
  }
  newPage();paragraph('AGUARDANDO PAGAMENTO',{font:bold,size:12});
  paragraph('Finalizado em '+new Date(order.createdAt).toLocaleString('pt-BR'),{color:gray,size:10,gap:12});
  paragraph('CLIENTE',{font:bold,size:9,color:gray});paragraph(order.customer.name,{size:13,font:bold});paragraph('Telefone / WhatsApp: '+order.customer.phone,{gap:12});
  if(order.customer.notes){paragraph('OBSERVAÇÕES',{font:bold,size:9,color:gray});paragraph(order.customer.notes,{gap:12});}
  tableHeader();
  for(const i of order.items){
    const names=wrap(i.name,265,10,bold),details=wrap(`${i.packQty} unidades de ${i.size} por fardo`,265,9),rowHeight=Math.max(46,(names.length+details.length)*14+17);
    if(y-rowHeight<80){newPage();tableHeader();}
    let top=y;for(const line of names){text(line,margin+9,top,10,bold);top-=14;}
    for(const line of details){text(line,margin+9,top,9,regular,gray);top-=14;}
    text(String(i.qty),343,y,10);const unit=money(i.unitCents),sub=money(i.unitCents*i.qty);
    const priceSize=8; text(unit,460-regular.widthOfTextAtSize(safe(unit),priceSize),y,priceSize);text(sub,right-9-bold.widthOfTextAtSize(safe(sub),priceSize),y,priceSize,bold);
    y-=rowHeight;page.drawLine({start:{x:margin,y:y+9},end:{x:right,y:y+9},thickness:.6,color:rgb(.87,.87,.85)});
  }
  ensure(168);y-=12;
  page.drawRectangle({x:margin,y:y-34,width:right-margin,height:48,color:yellow});text('TOTAL DOS PRODUTOS',margin+12,y-7,11,bold);
  const total=money(order.totalCents),totalSize=Math.min(18,225/bold.widthOfTextAtSize(safe(total),1));text(total,right-12-bold.widthOfTextAtSize(safe(total),totalSize),y-10,totalSize,bold);y-=56;
  paragraph('Frete não incluído. Entrega ou retirada e eventuais custos devem ser confirmados com o atendimento.',{size:9,color:gray});
  paragraph('Estoque de fardos descontado na finalização. Pagamento pendente de confirmação.',{size:9,color:gray});
  paragraph('Esta via não é nota fiscal nem comprovante de pagamento.',{size:10,font:bold});
  paragraph('Demonstração: pedido salvo somente neste navegador. Preços e estoque precisam ser confirmados pela equipe.',{size:8,color:gray});
  const pages=pdf.getPages();pages.forEach((p,index)=>{
    p.drawLine({start:{x:margin,y:55},end:{x:right,y:55},thickness:1,color:rgb(.87,.87,.85)});
    p.drawText('Suporte Araguaia: (62) 98445-2600',{x:margin,y:37,size:9,font:regular,color:gray});
    const label=`Página ${index+1} de ${pages.length}`;p.drawText(label,{x:right-regular.widthOfTextAtSize(label,9),y:37,size:9,font:regular,color:gray});
  });
  return pdf.save();
}};
