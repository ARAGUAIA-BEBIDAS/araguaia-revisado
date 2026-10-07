// Comportamento da prévia. Senhas e dados cadastrais não são persistidos ou enviados.
// Integre os submits a um backend de autenticação antes de usar em produção.
const $=s=>document.querySelector(s);
document.querySelectorAll('[data-password]').forEach(button=>button.addEventListener('click',()=>{
  const input=document.getElementById(button.dataset.password),show=input.type==='password';
  input.type=show?'text':'password';button.textContent=show?'Ocultar':'Mostrar';button.setAttribute('aria-pressed',String(show));
  button.setAttribute('aria-label',(show?'Ocultar ':'Mostrar ')+(input.id==='confirm-password'?'confirmação de senha':'senha'));
}));
function setError(input,text){input.setAttribute('aria-invalid',String(!!text));const message=document.getElementById(input.id+'-error');if(message)message.textContent=text;}
function validate(input){
  const value=input.value.trim();let error='';
  if(input.required&&!value)error='Preencha este campo.';
  else if(input.type==='email'&&input.validity.typeMismatch)error='Informe um e-mail válido, como voce@exemplo.com.';
  else if(input.id==='name'&&value.length<3)error='Informe seu nome com pelo menos 3 caracteres.';
  else if(input.id==='phone'&&![10,11].includes(value.replace(/\D/g,'').length))error='Informe o celular ou telefone com DDD (10 ou 11 dígitos).';
  else if(input.id==='cep'&&value.replace(/\D/g,'').length!==8)error='O CEP deve ter 8 dígitos.';
  else if(input.id==='new-password'&&input.value.length<8)error='Crie uma senha com pelo menos 8 caracteres.';
  else if(input.id==='confirm-password'&&input.value!==$('#new-password').value)error='As senhas precisam ser iguais.';
  setError(input,error);return !error;
}
document.querySelectorAll('input,select').forEach(input=>{
  input.addEventListener('blur',()=>{if(input.value||input.getAttribute('aria-invalid')==='true')validate(input);});
  input.addEventListener('input',()=>{if(input.getAttribute('aria-invalid')==='true')validate(input);const status=input.closest('form').querySelector('.form-status');if(status)status.hidden=true;});
});
function validateGroup(group){let first=null;group.querySelectorAll('input,select').forEach(input=>{if(!validate(input)&&!first)first=input;});if(first)first.focus();return !first;}
function status(form,title,text,link=false){const box=form.querySelector('.form-status');box.replaceChildren();const heading=document.createElement('strong');heading.textContent=title;const copy=document.createElement('p');copy.textContent=text;box.append(heading,copy);if(link){const a=document.createElement('a');a.href='araguaia-loja-v1/index.html';a.textContent='Explorar a loja de demonstração';box.append(a);}box.hidden=false;box.focus();}
const login=$('#login-form');if(login)login.addEventListener('submit',e=>{e.preventDefault();if(!validateGroup(login))return;$('#password').value='';$('#password').type='password';const toggle=login.querySelector('[data-password]');toggle.textContent='Mostrar';toggle.setAttribute('aria-pressed','false');toggle.setAttribute('aria-label','Mostrar senha');status(login,'Formulário conferido.','Esta prévia ainda não autentica usuários. Você pode explorar o catálogo de demonstração sem criar uma conta.',true);});
const recovery=$('#recovery-form');if(recovery)recovery.addEventListener('submit',e=>{e.preventDefault();if(!validateGroup(recovery))return;status(recovery,'E-mail validado para a prévia.','Nenhuma mensagem foi enviada. O envio do link de recuperação será habilitado ao conectar o serviço de autenticação.');});
const register=$('#register-form');if(register){
  let step=0;const groups=[...register.querySelectorAll('[data-step]')],steps=[...document.querySelectorAll('.steps li')];
  function showStep(){groups.forEach((g,i)=>g.hidden=i!==step);steps.forEach((li,i)=>{li.classList.toggle('current',i===step);li.classList.toggle('done',i<step);if(i===step)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');});$('#previous-step').hidden=step===0;$('#next-step').textContent=step===2?'Concluir cadastro':'Continuar';groups[step].querySelector('input,select').focus();}
  $('#previous-step').addEventListener('click',()=>{if(step>0){step--;showStep();}});
  const phone=$('#phone');phone.addEventListener('input',()=>{const digits=phone.value.replace(/\D/g,'').slice(0,11);phone.value=digits.length>2?'('+digits.slice(0,2)+') '+digits.slice(2,digits.length>10?7:6)+(digits.length>6?'-'+digits.slice(digits.length>10?7:6):''):digits;});
  const cep=$('#cep');cep.addEventListener('input',()=>{const digits=cep.value.replace(/\D/g,'').slice(0,8);cep.value=digits.length>5?digits.slice(0,5)+'-'+digits.slice(5):digits;});
  function checks(){$('#length-check').classList.toggle('met',$('#new-password').value.length>=8);$('#match-check').classList.toggle('met',!!$('#confirm-password').value&&$('#new-password').value===$('#confirm-password').value);if($('#confirm-password').getAttribute('aria-invalid')==='true')validate($('#confirm-password'));}
  $('#new-password').addEventListener('input',checks);$('#confirm-password').addEventListener('input',checks);
  register.addEventListener('submit',e=>{
    e.preventDefault();if(!validateGroup(groups[step]))return;
    if(step<2){step++;showStep();return;}
    // Revalidate previous steps in case browser autofill changed any fields.
    for(let i=0;i<2;i++)if(!validateGroup(groups[i])){step=i;showStep();return;}
    $('#new-password').value='';$('#confirm-password').value='';checks();
    document.querySelectorAll('[data-password]').forEach(b=>{document.getElementById(b.dataset.password).type='password';b.textContent='Mostrar';b.setAttribute('aria-pressed','false');b.setAttribute('aria-label',b.dataset.password==='confirm-password'?'Mostrar confirmação de senha':'Mostrar senha');});
    status(register,'Cadastro conferido na demonstração.','Os dados foram validados, mas nenhuma conta foi criada. Não salvamos seus dados nem sua senha nesta prévia.',true);
  });
}
