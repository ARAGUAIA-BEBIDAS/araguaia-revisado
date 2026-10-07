// Dados iniciais de exemplo. O cadastro do administrador é salvo no navegador.
window.ARAGUAIA_CATALOGO = [
  {id:'1', name:'Cerveja Lager Long Neck', category:'Cervejas', size:'330 ml', price:143.76, packQty:24, stock:20, sprite:1},
  {id:'2', name:'Refrigerante Cola', category:'Refrigerantes', size:'2 litros', price:53.94, packQty:6, stock:30, sprite:2},
  {id:'3', name:'Água Mineral sem Gás', category:'Águas', size:'500 ml', price:23.88, packQty:12, stock:40, sprite:3},
  {id:'4', name:'Energético Original', category:'Energéticos', size:'473 ml', price:95.88, packQty:12, stock:15, sprite:4},
  {id:'5', name:'Cerveja Pilsen Lata', category:'Cervejas', size:'350 ml', price:35.88, packQty:12, stock:25, sprite:5},
  {id:'6', name:'Refrigerante Limão', category:'Refrigerantes', size:'2 litros', price:38.94, packQty:6, stock:20, sprite:6}
].map(p => ({...p, description:'', active:true, image:''}));
