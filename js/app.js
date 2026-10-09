/* FIREBASE REALTIME DATABASE
       1) Crie um projeto no Firebase e habilite Realtime Database.
       2) Cole abaixo os dados exibidos em Configurações do projeto > Seus apps > Web.
       3) O app usa o caminho barbershop/v1. localStorage existe apenas como modo demonstração quando o Firebase não está configurado.
       4) Em produção, proteja as regras do banco e substitua a senha local por Firebase Authentication.
    */
    const firebaseConfig = {
  apiKey: "AIzaSyCvnQLxQhyB_2R3p6g3gkJcU1gRR8O0tjA",
  authDomain: "barbearia-6381c.firebaseapp.com",
  databaseURL: "https://barbearia-6381c-default-rtdb.firebaseio.com",
  projectId: "barbearia-6381c",
  storageBucket: "barbearia-6381c.firebasestorage.app",
  messagingSenderId: "1050785912776",
  appId: "1:1050785912776:web:53eabeb2bd8155d27ed2fd",
  measurementId: "G-R3DSBJ4L31"
};
    /* Senha de acesso ao painel oculta: o codigo guarda apenas o hash SHA-256, nunca o valor.
       Para trocar a senha: abra o site, pressione F12, rode no console  sha256("nova-senha")
       e cole o resultado abaixo em ADMIN_PASSWORD_HASH. */
    const ADMIN_PASSWORD_HASH = "74d710ea49f68458b1cbd9036967ab620b2fc7e8ab0814e348e7483d293daa1e";

    function sha256(msg){
      const K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
      const utf8=new TextEncoder().encode(msg),l=utf8.length;
      const total=Math.ceil((l+9)/64)*64;
      const padded=new Uint8Array(total);padded.set(utf8);padded[l]=0x80;
      const dv=new DataView(padded.buffer),bitLen=l*8;
      dv.setUint32(total-8,Math.floor(bitLen/4294967296));
      dv.setUint32(total-4,bitLen%4294967296);
      let H=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
      const w=new Uint32Array(64),rotr=(x,n)=>(x>>>n)|(x<<(32-n));
      for(let i=0;i<total;i+=64){
        for(let j=0;j<16;j++)w[j]=dv.getUint32(i+j*4);
        for(let j=16;j<64;j++){
          const s0=rotr(w[j-15],7)^rotr(w[j-15],18)^(w[j-15]>>>3);
          const s1=rotr(w[j-2],17)^rotr(w[j-2],19)^(w[j-2]>>>10);
          w[j]=(w[j-16]+s0+w[j-7]+s1)>>>0;
        }
        let[a,b,c,d,e,f,g,h]=H;
        for(let j=0;j<64;j++){
          const S1=rotr(e,6)^rotr(e,11)^rotr(e,25),ch=(e&f)^(~e&g);
          const t1=(h+S1+ch+K[j]+w[j])>>>0;
          const S0=rotr(a,2)^rotr(a,13)^rotr(a,22),maj=(a&b)^(a&c)^(b&c);
          const t2=(S0+maj)>>>0;
          h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;
        }
        H=[(a+H[0])>>>0,(b+H[1])>>>0,(c+H[2])>>>0,(d+H[3])>>>0,(e+H[4])>>>0,(f+H[5])>>>0,(g+H[6])>>>0,(h+H[7])>>>0];
      }
      return H.map(x=>x.toString(16).padStart(8,"0")).join("");
    }

    const STORAGE_KEY = "emanuelSousaBarbeariaDataV2";
    const WEEK_DAYS=[{key:"0",label:"Domingo"},{key:"1",label:"Segunda-feira"},{key:"2",label:"Terça-feira"},{key:"3",label:"Quarta-feira"},{key:"4",label:"Quinta-feira"},{key:"5",label:"Sexta-feira"},{key:"6",label:"Sábado"}];
    const DEFAULT_WEEKLY_HOURS=Object.fromEntries(WEEK_DAYS.map(day=>[day.key,{closed:day.key==="0"||day.key==="1",periods:[{start:"09:00",end:"12:00"},{start:"13:00",end:"19:00"}]}]));
    const defaultData = {
      settings:{brand:"Barbearia Emanuel Sousa",professional:"Emanuel Pereira De Sousa",address:"Rua do Estilo, 126 — Centro",hours:"Ter–Sáb · 09h às 19h",whatsapp:"",instagram:"",confirmationObs:"chegar 10 min antes do horário se não pode perder o seu horário!",morningOpen:"09:00",morningClose:"12:00",afternoonOpen:"13:00",afternoonClose:"19:00",weeklyHours:structuredClone(DEFAULT_WEEKLY_HOURS),interval:30},
      services:{
        corte:{id:"corte",name:"Corte masculino",duration:40,price:40,description:"Tesoura, máquina e acabamento."},
        combo:{id:"combo",name:"Corte + barba",duration:60,price:60,description:"Experiência completa, do fio ao contorno."},
        barba:{id:"barba",name:"Barba",duration:30,price:30,description:"Desenho, toalha quente e finalização."}
      },
      bookings:{},blocks:{}
    };
    let data = structuredClone(defaultData), dbApi = null, wizardStep = 1;
    let draft = {serviceId:"",date:"",time:"",name:"",phone:"",notes:""};
    let adminView = "dashboard";

    const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
    const money = n => Number(n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
    const cleanPhone = v => (v||"").replace(/\D/g,"");
    const phoneKey = v => {const n=cleanPhone(v);return n.startsWith("55")&&n.length>=12?n.slice(2):n};
    const whatsappPhone = v => {const n=cleanPhone(v);return n.startsWith("55")?n:`55${n}`};
    const formatPhone = v => {const n=phoneKey(v);return n.length===11?`(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7)}`:n.length===10?`(${n.slice(0,2)}) ${n.slice(2,6)}-${n.slice(6)}`:cleanPhone(v)};
    const todayISO = () => {const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10)};
    const formatDate = d => new Date(d+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"short"});
    const formatDateNumeric = d => new Date(d+"T12:00:00").toLocaleDateString("pt-BR");
    const addDaysISO = (date,days) => {const d=new Date(date+"T12:00:00");d.setDate(d.getDate()+days);return d.toISOString().slice(0,10)};
    const uid = () => Date.now().toString(36)+Math.random().toString(36).slice(2,7);
    const esc = v => String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
    let financeStart = "", financeEnd = "";
    function toast(msg){const el=$("#toast");el.textContent=msg;el.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove("show"),2600)}
    function maskPhone(value){const n=phoneKey(value).slice(0,11);if(n.length<=2)return n;if(n.length<=6)return `(${n.slice(0,2)}) ${n.slice(2)}`;if(n.length<=10)return `(${n.slice(0,2)}) ${n.slice(2,6)}-${n.slice(6)}`;return `(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7)}`}
    function instagramHandle(v){const t=String(v||"").trim();if(!t)return "";const m=t.replace(/^https?:\/\/(www\.)?instagram\.com\//i,"").replace(/^@/,"").replace(/\/.*$/,"").trim();return m}
    function renderInstagram(){const el=$("#instagramLink");if(!el)return;const h=instagramHandle(data.settings.instagram);if(!h){el.hidden=true;el.removeAttribute("href");return}el.hidden=false;el.href=`https://instagram.com/${h}`;el.title=`@${h}`}
    async function initStorage(){
      const configured = firebaseConfig.apiKey && firebaseConfig.databaseURL;
      if(configured){
        try{
          const appMod = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
          const dbMod = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js");
          const app = appMod.initializeApp(firebaseConfig), db = dbMod.getDatabase(app), root = dbMod.ref(db,"barbershop/v1");
          dbApi = {save:v=>dbMod.set(root,v)};
          dbMod.onValue(root,snap=>{if(snap.exists()) data=mergeData(snap.val()); else dbApi.save(defaultData);renderAll()});
          return;
        }catch(err){console.warn("Firebase indisponível; usando modo local.",err);toast("Firebase indisponível: modo local ativado")}
      }
      const saved=localStorage.getItem(STORAGE_KEY);if(saved){try{data=mergeData(JSON.parse(saved))}catch{data=structuredClone(defaultData)}}
      renderAll();
    }
    function normalizeWeeklyHours(saved,settings){
      const legacyPeriods=[{start:settings.morningOpen,end:settings.morningClose},{start:settings.afternoonOpen,end:settings.afternoonClose}].filter(p=>p.start&&p.end);
      return Object.fromEntries(WEEK_DAYS.map(day=>{const current=saved?.[day.key],fallback=DEFAULT_WEEKLY_HOURS[day.key];if(!current)return [day.key,{closed:fallback.closed,periods:structuredClone(legacyPeriods)}];const periods=Array.isArray(current.periods)?current.periods.filter(p=>p?.start&&p?.end).map(p=>({start:p.start,end:p.end})):structuredClone(legacyPeriods);return [day.key,{closed:Boolean(current.closed),periods}]}));
    }
    function mergeData(v){const saved=v.settings||{},settings={...defaultData.settings,...saved};if(!saved.morningOpen)settings.morningOpen=saved.open||defaultData.settings.morningOpen;if(!saved.morningClose)settings.morningClose=defaultData.settings.morningClose;if(!saved.afternoonOpen)settings.afternoonOpen=defaultData.settings.afternoonOpen;if(!saved.afternoonClose)settings.afternoonClose=saved.close||defaultData.settings.afternoonClose;settings.weeklyHours=normalizeWeeklyHours(saved.weeklyHours,settings);return {settings,services:v.services||structuredClone(defaultData.services),bookings:v.bookings||{},blocks:v.blocks||{}}}
    async function persist(){if(dbApi) await dbApi.save(data);else localStorage.setItem(STORAGE_KEY,JSON.stringify(data));renderAll()}

    function renderAll(){
      $$('[data-brand]').forEach(e=>e.textContent=data.settings.brand);
      $("#addressText").textContent=data.settings.address;$("#hoursText").textContent=data.settings.hours;renderInstagram();
      renderPublicServices();updateNextAvailability();if($("#adminOverlay").classList.contains("open"))renderAdmin();
    }
    function serviceImage(s){return typeof s.image==="string"&&s.image.startsWith("data:image/")?s.image:""}
    function renderPublicServices(){
      $("#publicServices").innerHTML=Object.values(data.services).map((s,i)=>{const image=serviceImage(s);return `<article class="service-card ${image?"has-photo":""}"><span class="service-num">CADEIRA · ${String(i+1).padStart(2,"0")}</span>${image?`<img class="service-photo" src="${esc(image)}" alt="${esc(s.name)}" loading="lazy">`:""}<div><h3>${esc(s.name)}</h3><p>${esc(s.description||"Atendimento com hora marcada.")}</p></div><div class="service-meta"><span>${s.duration} min</span><span>${money(s.price)}</span></div></article>`}).join("");
    }
    function updateNextAvailability(){
      const slots=getSlots(todayISO()),free=slots.find(s=>!s.busy);$("#nextAvailability").textContent=free?`Hoje, ${free.time}`:"Consulte amanhã";
    }
    function openOverlay(id){$("#"+id).classList.add("open");document.body.style.overflow="hidden"}
    function closeOverlay(id){$("#"+id).classList.remove("open");if(!$(".overlay.open"))document.body.style.overflow="";else document.body.style.overflow=""}
    $$('[data-open-booking]').forEach(b=>b.onclick=()=>{draft={serviceId:"",date:todayISO(),time:"",name:"",phone:"",notes:""};wizardStep=1;$("#bookingTitle").textContent="Agendar horário";renderWizard();openOverlay("bookingOverlay")});
    $$('[data-open-client]').forEach(b=>b.onclick=()=>openOverlay("clientOverlay"));
    $$('[data-open-admin]').forEach(b=>b.onclick=()=>{if(sessionStorage.getItem("emanuelSousaAdmin")==="1")openAdmin();else openOverlay("adminLoginOverlay")});
    $$('[data-close]').forEach(b=>b.onclick=()=>closeOverlay(b.dataset.close));
    $$(".overlay").forEach(o=>o.addEventListener("mousedown",e=>{if(e.target===o&&o.id!=="adminOverlay")closeOverlay(o.id)}));
    document.addEventListener("keydown",e=>{if(e.key==="Escape"){const o=$$(".overlay.open").pop();if(o)closeOverlay(o.id)}});
    $("#adminLoginForm").addEventListener("submit",e=>{e.preventDefault();login()});
    function login(){if(sha256($("#adminPassword").value)===ADMIN_PASSWORD_HASH){sessionStorage.setItem("emanuelSousaAdmin","1");$("#adminPassword").value="";$("#loginError").textContent="";closeOverlay("adminLoginOverlay");openAdmin()}else $("#loginError").textContent="Senha incorreta. Tente novamente."}
    function openAdmin(){adminView="dashboard";renderAdmin();openOverlay("adminOverlay")}
    $("#logoutBtn").onclick=()=>{sessionStorage.removeItem("emanuelSousaAdmin");closeOverlay("adminOverlay");toast("Sessão administrativa encerrada")};
    $("#adminMenu").onclick=e=>{const b=e.target.closest("[data-view]");if(!b)return;adminView=b.dataset.view;$$('[data-view]').forEach(x=>x.classList.toggle("active",x===b));renderAdmin()};
    function renderAdmin(){
      const titles={dashboard:"Visão geral",agenda:"Minha agenda",clientes:"Clientes",servicos:"Serviços",financeiro:"Financeiro",config:"Configurações"};$("#adminTitle").textContent=titles[adminView];
      const c=$("#adminContent");if(adminView==="dashboard")c.innerHTML=dashboardView();if(adminView==="agenda")c.innerHTML=agendaView();if(adminView==="clientes")c.innerHTML=clientsView();if(adminView==="servicos")c.innerHTML=servicesView();if(adminView==="financeiro")c.innerHTML=financeView();if(adminView==="config")c.innerHTML=configView();bindAdmin();
    }
    function activeBookings(){return Object.values(data.bookings).filter(b=>b.status!=="cancelled")}
    function dashboardView(){
      const all=activeBookings(),today=all.filter(b=>b.date===todayISO()),revenue=all.filter(b=>b.status==="completed").reduce((a,b)=>a+Number(b.price),0),clients=new Set(all.map(b=>b.phone)).size;
      return `<div class="metric-grid"><div class="metric"><small>Hoje</small><strong>${today.length}</strong><span>atendimentos</span></div><div class="metric"><small>Faturamento registrado</small><strong>${money(revenue)}</strong></div><div class="metric"><small>Clientes</small><strong>${clients}</strong></div><div class="metric"><small>Ticket médio</small><strong>${money(all.length?all.reduce((a,b)=>a+Number(b.price),0)/all.length:0)}</strong></div></div>${bookingTable(today.length?today:all.slice(0,6),today.length?"Agenda de hoje":"Próximos registros")}`
    }
    function blockTable(){const items=Object.values(data.blocks).sort((a,b)=>((a.startDate||a.date)+(a.time||"")).localeCompare((b.startDate||b.date)+(b.time||"")));if(!items.length)return '<div class="empty">Nenhum bloqueio cadastrado.</div>';return `<div class="table-wrap"><table><thead><tr><th>Período</th><th>Horário</th><th>Duração</th><th>Ação</th></tr></thead><tbody>${items.map(block=>{const start=block.startDate||block.date,end=block.endDate||block.date;return `<tr><td>${formatDateNumeric(start)}${end!==start?` até ${formatDateNumeric(end)}`:""}</td><td><b>${block.time}</b></td><td>${Number(block.duration)||Number(data.settings.interval)||30} min</td><td><button class="mini no" data-delete-block="${block.id}">Remover</button></td></tr>`}).join("")}</tbody></table></div>`}
    function agendaView(){const today=todayISO();return `<div class="panel"><div class="panel-head"><h3>Bloquear um horário</h3><span class="status">Até 31 dias</span></div><div style="padding:18px" class="form-grid"><div class="field"><label>Data inicial</label><input class="input" id="blockStartDate" type="date" min="${today}" value="${today}"></div><div class="field"><label>Data final</label><input class="input" id="blockEndDate" type="date" min="${today}" max="${addDaysISO(today,30)}" value="${today}"></div><div class="field"><label>Horário</label><input class="input" id="blockTime" type="time" value="12:00"></div><div class="field"><label>Duração do bloqueio</label><input class="input" id="blockDuration" type="number" min="5" step="5" value="${Number(data.settings.interval)||30}"></div><div class="field full"><button class="btn btn-dark" id="addBlock">Bloquear no período</button></div></div><div class="block-list"><div class="panel-head"><h3>Bloqueios cadastrados</h3><span class="status">${Object.keys(data.blocks).length}</span></div>${blockTable()}</div></div>${bookingTable(Object.values(data.bookings).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)),"Todos os agendamentos",true)}`}
    function notificationStateMarkup(booking){
      const cancellation=booking.status==="cancelled",client=cancellation?booking.cancellationNotifiedClient:booking.notifiedClient,owner=cancellation?booking.cancellationNotifiedOwner:booking.notifiedOwner,status=cancellation?booking.cancellationNotificationStatus:booking.notificationStatus;
      if(!status)return '<small class="notification-state">WhatsApp: ainda não registrado</small>';
      const css=status==="sent"?"ok":status==="partial"?"partial":"failed";
      return `<small class="notification-state ${css}">WhatsApp: cliente ${client?"✓":"✕"} · barbeiro ${owner?"✓":"✕"}</small>`;
    }
    function notificationActions(booking){
      const cancellation=booking.status==="cancelled",event=cancellation?"cancellation":"booking",client=(cancellation?booking.cancellationNotifiedClient:booking.notifiedClient)||booking.status==="pending";
      if(booking.status!=="confirmed"&&!cancellation)return "";
      if(client)return "";
      const label=cancellation?"cancelamento":"confirmação";
      return `<button class="mini whatsapp" data-action="resend-${event}-client" data-id="${booking.id}">Reenviar ${label} ao cliente</button>`;
    }
    function bookingTable(items,title,allowDelete=false){
      if(!items.length)return `<div class="panel"><div class="panel-head"><h3>${title}</h3></div><div class="empty">Nenhum agendamento por aqui.</div></div>`;
      const rows=items.map(b=>`<tr><td>${formatDate(b.date)}</td><td><b>${b.time}</b></td><td>${esc(b.name)}<br><small>${formatPhone(b.phone)}</small></td><td>${esc(b.serviceName)}</td><td><span class="status ${b.status}">${statusLabel(b.status)}</span>${notificationStateMarkup(b)}</td><td><div class="table-actions">${b.status==="pending"?`<button class="mini whatsapp" data-action="confirm" data-id="${b.id}">Confirmar + WhatsApp</button>`:""}${notificationActions(b)}${b.status!=="completed"&&b.status!=="cancelled"?`<button class="mini" data-action="complete" data-id="${b.id}">Concluir</button><button class="mini no" data-action="cancel" data-id="${b.id}">Cancelar + WhatsApp</button>`:""}${allowDelete?`<button class="mini no" data-delete-booking="${b.id}" title="Excluir agendamento" aria-label="Excluir agendamento de ${esc(b.name)}">🗑</button>`:""}</div></td></tr>`).join("");
      return `<div class="panel"><div class="panel-head"><h3>${title}</h3><span class="status">${items.length} registros</span></div><div class="table-wrap"><table><thead><tr><th>Data</th><th>Hora</th><th>Cliente</th><th>Serviço</th><th>Status</th><th>Ações</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
    }
    function servicesView(){return `<div class="panel"><div class="panel-head"><h3>Serviços e preços</h3><span class="status">${Object.keys(data.services).length} serviços</span></div><div style="padding:18px;display:grid;gap:12px">${Object.values(data.services).map(s=>{const image=serviceImage(s);return `<div class="service-admin-card"><div class="service-admin-head"><strong>${esc(s.name)}</strong><button class="mini no" data-delete-service="${s.id}">Excluir serviço</button></div><div class="form-grid"><div class="field"><label>Nome do serviço</label><input class="input" data-s-name="${s.id}" value="${esc(s.name)}"></div><div class="field"><label>Preço (R$)</label><input class="input" data-s-price="${s.id}" type="number" value="${s.price}" min="0" step="0.01"></div><div class="field"><label>Duração em minutos</label><input class="input" data-s-duration="${s.id}" type="number" value="${s.duration}" min="5" step="5"></div><div class="field"><label>Descrição</label><input class="input" data-s-description="${s.id}" value="${esc(s.description||"")}"></div><div class="field service-photo-field"><label>Foto do serviço</label><div class="service-photo-controls"><div data-photo-preview="${s.id}">${image?`<img class="service-photo-preview" src="${esc(image)}" alt="Foto de ${esc(s.name)}">`:`<div class="service-photo-empty">Nenhuma foto anexada</div>`}</div><input class="service-photo-input" id="servicePhoto-${s.id}" data-s-photo="${s.id}" type="file" accept="image/jpeg,image/png,image/webp"><div class="service-photo-buttons"><label class="btn btn-ghost" for="servicePhoto-${s.id}">📷 ${image?"Trocar foto":"Anexar foto"}</label>${image?`<button class="mini no" type="button" data-remove-photo="${s.id}">Remover foto</button>`:""}</div></div><p class="service-photo-help">JPG, PNG ou WebP. A imagem será ajustada automaticamente.</p></div></div></div>`}).join("")}<div class="service-admin-actions"><button class="btn btn-ghost" id="addService">+ Acrescentar serviço</button><button class="btn btn-dark" id="saveServices">Salvar alterações</button></div></div></div>`}
    function financeView(){
      const start=financeStart||`${todayISO().slice(0,7)}-01`,end=financeEnd||todayISO(),completed=financialBookings(start,end),revenue=completed.reduce((a,b)=>a+Number(b.price),0),counts={};completed.forEach(b=>counts[b.serviceName]=(counts[b.serviceName]||0)+1);const best=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0]||"—";
      return `<div class="panel"><div class="panel-head"><h3>Relatório por período</h3></div><div class="finance-filter"><div class="field"><label for="financeStart">Data inicial</label><input class="input" id="financeStart" type="date" value="${start}" max="${end}"></div><div class="field"><label for="financeEnd">Data final</label><input class="input" id="financeEnd" type="date" value="${end}" min="${start}"></div><button class="btn btn-ghost" id="applyFinancePeriod">Aplicar período</button><button class="btn btn-dark" id="downloadFinancePdf">↓ Baixar PDF</button></div><div class="finance-note">O PDF inclui somente atendimentos concluídos dentro do período selecionado.</div></div><div class="metric-grid"><div class="metric"><small>Atendimentos pagos</small><strong>${completed.length}</strong></div><div class="metric"><small>Faturamento</small><strong>${money(revenue)}</strong></div><div class="metric"><small>Ticket médio</small><strong>${money(completed.length?revenue/completed.length:0)}</strong></div><div class="metric"><small>Mais vendido</small><strong style="font-size:1.25rem">${esc(best)}</strong></div></div>${bookingTable(completed,"Histórico financeiro no período")}`}
    function financialBookings(start,end){return Object.values(data.bookings).filter(b=>b.status==="completed"&&b.date>=start&&b.date<=end).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time))}
    function validFinancePeriod(start,end){if(!start||!end){toast("Informe as datas inicial e final");return false}if(start>end){toast("A data inicial não pode ser posterior à final");return false}return true}
    function pdfText(value){return String(value??"").replace(/[–—]/g,"-").replace(/•/g,"-").replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/[^\x20-\xFF]/g,"?").replace(/([\\()])/g,"\\$1")}
    function pdfBytes(value){const out=new Uint8Array(value.length);for(let i=0;i<value.length;i++)out[i]=value.charCodeAt(i)&255;return out}
    function makeFinancialPdf(items,start,end){
      const revenue=items.reduce((sum,item)=>sum+Number(item.price),0),ticket=items.length?revenue/items.length:0,generated=new Date().toLocaleString("pt-BR"),rows=items.map(item=>({date:formatDateNumeric(item.date),time:item.time,client:item.name,service:item.serviceName,value:money(item.price)})),chunks=[];
      if(!rows.length)chunks.push([]);else for(let i=0;i<rows.length;i+=25)chunks.push(rows.slice(i,i+25));
      const pageContents=chunks.map((pageRows,pageIndex)=>{
        const commands=["BT",`/F2 16 Tf 50 805 Td (${pdfText(data.settings.brand)}) Tj`,`/F2 20 Tf 0 -28 Td (Relatorio financeiro) Tj`,`/F1 10 Tf 0 -20 Td (Periodo: ${pdfText(formatDateNumeric(start))} a ${pdfText(formatDateNumeric(end))}) Tj`,`0 -15 Td (Gerado em: ${pdfText(generated)}) Tj`];
        if(pageIndex===0){commands.push(`/F2 11 Tf 0 -28 Td (Resumo: ${items.length} atendimentos | Faturamento ${pdfText(money(revenue))} | Ticket medio ${pdfText(money(ticket))}) Tj`)}else commands.push(`/F1 9 Tf 0 -28 Td (Continuacao - pagina ${pageIndex+1}) Tj`);
        commands.push("ET","0.78 G 50 700 m 545 700 l S","BT","/F2 9 Tf","50 682 Td (Data) Tj","60 0 Td (Hora) Tj","42 0 Td (Cliente) Tj","170 0 Td (Servico) Tj","180 0 Td (Valor) Tj","ET","0.78 G 50 674 m 545 674 l S");
        let y=656;
        pageRows.forEach(row=>{const client=String(row.client).slice(0,27),service=String(row.service).slice(0,25);commands.push("BT","/F1 8 Tf",`1 0 0 1 50 ${y} Tm (${pdfText(row.date)}) Tj`,`1 0 0 1 110 ${y} Tm (${pdfText(row.time)}) Tj`,`1 0 0 1 152 ${y} Tm (${pdfText(client)}) Tj`,`1 0 0 1 322 ${y} Tm (${pdfText(service)}) Tj`,`1 0 0 1 502 ${y} Tm (${pdfText(row.value)}) Tj`,"ET");y-=22});
        if(!pageRows.length)commands.push("BT","/F1 11 Tf","50 640 Td (Nenhum atendimento concluido no periodo selecionado.) Tj","ET");
        commands.push("BT","/F1 8 Tf",`50 35 Td (Pagina ${pageIndex+1} de ${chunks.length}) Tj`,"ET");return commands.join("\n")
      });
      const objects=["<< /Type /Catalog /Pages 2 0 R >>","", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>","<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"];
      const kids=[];pageContents.forEach((content,i)=>{const pageId=5+i*2,streamId=pageId+1;kids.push(`${pageId} 0 R`);objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${streamId} 0 R >>`);objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`)});objects[1]=`<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${kids.length} >>`;
      let pdf="%PDF-1.4\n%\xE2\xE3\xCF\xD3\n",offsets=[0];objects.forEach((object,i)=>{offsets.push(pdf.length);pdf+=`${i+1} 0 obj\n${object}\nendobj\n`});const xref=pdf.length;pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;for(let i=1;i<=objects.length;i++)pdf+=`${String(offsets[i]).padStart(10,"0")} 00000 n \n`;pdf+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;return new Blob([pdfBytes(pdf)],{type:"application/pdf"})
    }
    function downloadFinancialPdf(start,end){const items=financialBookings(start,end),blob=makeFinancialPdf(items,start,end),url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=`relatorio-financeiro-${start}-a-${end}.pdf`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast("Relatório financeiro baixado")}
    function weeklyScheduleFields(){return WEEK_DAYS.map(dayInfo=>{const day=data.settings.weeklyHours[dayInfo.key],periods=day.periods||[],first=periods[0]||{start:"",end:""},second=periods[1]||{start:"",end:""},disabled=day.closed?"disabled":"";return `<div class="weekly-day ${day.closed?"is-closed":""}" data-weekday="${dayInfo.key}"><div class="weekly-day-head"><strong>${dayInfo.label}</strong><label class="closed-toggle"><input type="checkbox" data-day-closed="${dayInfo.key}" ${day.closed?"checked":""}> Fechado</label></div><div class="weekly-times"><div class="field"><label>1º turno — abre</label><input class="input" type="time" data-day-start="${dayInfo.key}-0" value="${first.start}" ${disabled}></div><div class="field"><label>1º turno — fecha</label><input class="input" type="time" data-day-end="${dayInfo.key}-0" value="${first.end}" ${disabled}></div><div class="field"><label>2º turno — abre</label><input class="input" type="time" data-day-start="${dayInfo.key}-1" value="${second.start}" ${disabled}></div><div class="field"><label>2º turno — fecha</label><input class="input" type="time" data-day-end="${dayInfo.key}-1" value="${second.end}" ${disabled}></div></div></div>`}).join("")}
    function configView(){const s=data.settings;return `<div class="panel"><div class="panel-head"><h3>Dados da barbearia</h3></div><div style="padding:18px" class="form-grid"><div class="field"><label>Nome</label><input class="input" id="cfgBrand" value="${esc(s.brand)}"></div><div class="field"><label>Profissional</label><input class="input" id="cfgProfessional" value="${esc(s.professional||"")}" placeholder="Nome exibido na confirmação"></div><div class="field"><label>WhatsApp da barbearia (com DDI)</label><input class="input" id="cfgWhats" value="${esc(s.whatsapp)}" placeholder="5511999999999"></div><div class="field"><label>Instagram da empresa</label><input class="input" id="cfgInstagram" value="${esc(s.instagram||"")}" placeholder="@barbeariaemanuelsousa"></div><div class="field full"><label>Observação da confirmação</label><input class="input" id="cfgObs" value="${esc(s.confirmationObs||"")}" placeholder="Ex.: chegar 10 min antes do horário"></div><div class="field full"><label>Endereço</label><input class="input" id="cfgAddress" value="${esc(s.address)}"></div><div class="field full"><label>Texto do horário exibido no site</label><input class="input" id="cfgHours" value="${esc(s.hours)}"></div><div class="field"><label>Intervalos da agenda em minutos</label><input class="input" id="cfgInterval" type="number" min="10" step="5" value="${s.interval}"></div></div></div><div class="panel"><div class="panel-head"><h3>Funcionamento por dia da semana</h3><span class="status">Até 2 turnos por dia</span></div><div class="weekly-schedule">${weeklyScheduleFields()}<button class="btn btn-dark" id="saveConfig">Salvar configurações</button></div></div><div class="panel"><div class="panel-head"><h3>Conexão de dados</h3></div><div style="padding:18px;color:var(--muted)">${dbApi?"✓ Firebase Realtime Database conectado.":"Modo demonstração local. Preencha o objeto firebaseConfig no topo do arquivo js/app.js para conectar ao Realtime Database."}<br>✓ Mensagens de WhatsApp enviadas direto pelo aparelho — sem servidor externo.${cleanPhone(s.whatsapp).length>=10?`<br>✅ WhatsApp da barbearia configurado (${esc(formatPhone(s.whatsapp))}).`:"<br>⚠️ Cadastre o WhatsApp da barbearia acima para o cliente conseguir avisar o barbeiro."}</div></div>`}
    function captureServicesForm(){$$('[data-s-name]').forEach(el=>{const s=data.services[el.dataset.sName];if(!s)return;s.name=el.value.trim()||s.name;s.price=Math.max(0,Number($(`[data-s-price="${s.id}"]`).value)||0);s.duration=Math.max(5,Number($(`[data-s-duration="${s.id}"]`).value)||30);s.description=$(`[data-s-description="${s.id}"]`).value.trim()})}
    function resizeServicePhoto(file){
      return new Promise((resolve,reject)=>{if(!file.type.startsWith("image/"))return reject(new Error("Escolha um arquivo de imagem"));if(file.size>10*1024*1024)return reject(new Error("A foto deve ter no máximo 10 MB"));const reader=new FileReader();reader.onerror=()=>reject(new Error("Não foi possível ler a foto"));reader.onload=()=>{const image=new Image();image.onerror=()=>reject(new Error("Arquivo de imagem inválido"));image.onload=()=>{const max=1200,scale=Math.min(1,max/Math.max(image.width,image.height)),canvas=document.createElement("canvas");canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);canvas.getContext("2d").drawImage(image,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL("image/jpeg",.82))};image.src=reader.result};reader.readAsDataURL(file)})
    }
    function bindAdmin(){
      $$('[data-s-photo]').forEach(input=>input.onchange=async()=>{const file=input.files?.[0];if(!file)return;try{const image=await resizeServicePhoto(file),service=data.services[input.dataset.sPhoto];if(!service)return;service.image=image;renderAdmin();toast("Foto pronta. Clique em Salvar alterações") }catch(error){toast(error.message)}});
      $$('[data-remove-photo]').forEach(button=>button.onclick=()=>{const service=data.services[button.dataset.removePhoto];if(!service)return;delete service.image;renderAdmin();toast("Foto removida. Clique em Salvar alterações")});
      $$('[data-action]').forEach(button=>button.onclick=async()=>{
        const item=data.bookings[button.dataset.id],action=button.dataset.action;if(!item)return;
        if(action==="cancel"&&!confirm(`Cancelar o horário de ${item.name} e enviar os avisos automáticos?`))return;
        if(action==="complete"){item.status="completed";item.updatedAt=new Date().toISOString();await persist();return toast("Agendamento concluído")}
        if(action==="cancel"){try{await cancelBooking(item,"admin")}catch(error){console.error("Falha ao cancelar",error);toast("Não foi possível atualizar o cancelamento no Firebase.")}return}
        if(action==="confirm"){
          item.status="confirmed";item.confirmedAt=new Date().toISOString();item.notifiedClient=false;item.notifiedOwner=false;item.notificationStatus="pending";item.notificationError=null;item.updatedAt=item.confirmedAt;
          await persist();return resendNotification(item.id,"booking","client");
        }
        const match=action.match(/^resend-(booking|cancellation)-(both|client|owner)$/);
        if(match)return resendNotification(item.id,match[1],match[2]==="both"?"client":match[2]);
      });
      $$('[data-delete-booking]').forEach(button=>button.onclick=async()=>{const item=data.bookings[button.dataset.deleteBooking];if(!item||!confirm(`Excluir definitivamente o agendamento de ${item.name}, em ${formatDate(item.date)} às ${item.time}?`))return;delete data.bookings[item.id];await persist();toast("Agendamento excluído")});
      $$('[data-delete-client]').forEach(button=>button.onclick=async()=>{const phone=cleanPhone(button.dataset.deleteClient),name=button.dataset.clientName,count=Object.values(data.bookings).filter(item=>cleanPhone(item.phone)===phone).length;if(!confirm(`Excluir ${name} do cadastro? Isso removerá ${count} agendamento(s) e não poderá ser desfeito.`))return;Object.keys(data.bookings).forEach(id=>{if(cleanPhone(data.bookings[id].phone)===phone)delete data.bookings[id]});await persist();toast("Cliente excluído do cadastro")});
      const blockStart=$("#blockStartDate"),blockEnd=$("#blockEndDate");if(blockStart&&blockEnd)blockStart.onchange=()=>{blockEnd.min=blockStart.value;blockEnd.max=addDaysISO(blockStart.value,30);if(blockEnd.value<blockStart.value||blockEnd.value>blockEnd.max)blockEnd.value=blockStart.value};
      const block=$("#addBlock");if(block)block.onclick=async()=>{const startDate=$("#blockStartDate").value,endDate=$("#blockEndDate").value,time=$("#blockTime").value,duration=Math.max(5,Number($("#blockDuration").value)||Number(data.settings.interval)||30);if(!startDate||!endDate||!time)return toast("Informe o período e o horário");if(endDate<startDate)return toast("A data final deve ser igual ou posterior à inicial");const days=Math.round((new Date(endDate+"T12:00:00")-new Date(startDate+"T12:00:00"))/86400000);if(days>30)return toast("O bloqueio pode abranger no máximo 31 dias");const id=uid();data.blocks[id]={id,startDate,endDate,time,duration};await persist();toast(startDate===endDate?"Horário bloqueado neste dia":"Horário bloqueado em todo o período")};
      $$('[data-delete-block]').forEach(button=>button.onclick=async()=>{const item=data.blocks[button.dataset.deleteBlock];if(!item||!confirm("Remover este bloqueio de horário?"))return;delete data.blocks[item.id];await persist();toast("Bloqueio removido")});
      const applyFinance=$("#applyFinancePeriod");if(applyFinance)applyFinance.onclick=()=>{const start=$("#financeStart").value,end=$("#financeEnd").value;if(!validFinancePeriod(start,end))return;financeStart=start;financeEnd=end;renderAdmin()};
      const downloadPdf=$("#downloadFinancePdf");if(downloadPdf)downloadPdf.onclick=()=>{const start=$("#financeStart").value,end=$("#financeEnd").value;if(!validFinancePeriod(start,end))return;financeStart=start;financeEnd=end;downloadFinancialPdf(start,end)};
      const ss=$("#saveServices");if(ss)ss.onclick=async()=>{captureServicesForm();await persist();toast("Serviços atualizados")};
      const addService=$("#addService");if(addService)addService.onclick=async()=>{captureServicesForm();const id=`service_${uid()}`;data.services[id]={id,name:"Novo serviço",duration:30,price:0,description:""};await persist();toast("Novo serviço acrescentado")};
      $$('[data-delete-service]').forEach(button=>button.onclick=async()=>{if(Object.keys(data.services).length<=1)return toast("Mantenha pelo menos um serviço disponível");const service=data.services[button.dataset.deleteService];if(!service||!confirm(`Excluir o serviço ${service.name}? O histórico financeiro será preservado.`))return;captureServicesForm();delete data.services[service.id];await persist();toast("Serviço excluído")});
      $$('[data-day-closed]').forEach(checkbox=>checkbox.onchange=()=>{const card=checkbox.closest('[data-weekday]'),closed=checkbox.checked;card.classList.toggle("is-closed",closed);card.querySelectorAll('input[type="time"]').forEach(input=>input.disabled=closed)});
      const sc=$("#saveConfig");if(sc)sc.onclick=async()=>{const weeklyHours={};for(const dayInfo of WEEK_DAYS){const closed=$(`[data-day-closed="${dayInfo.key}"]`).checked,periods=[];for(let index=0;index<2;index++){const start=$(`[data-day-start="${dayInfo.key}-${index}"]`).value,end=$(`[data-day-end="${dayInfo.key}-${index}"]`).value;if(Boolean(start)!==Boolean(end))return toast(`Complete o início e o fim de ${dayInfo.label}`);if(start&&end){if(start>=end)return toast(`Revise os horários de ${dayInfo.label}`);periods.push({start,end})}}periods.sort((a,b)=>a.start.localeCompare(b.start));if(periods.length>1&&periods[0].end>periods[1].start)return toast(`Os turnos de ${dayInfo.label} não podem se sobrepor`);if(!closed&&!periods.length)return toast(`Informe um horário ou marque ${dayInfo.label} como fechado`);weeklyHours[dayInfo.key]={closed,periods}}data.settings={...data.settings,brand:$("#cfgBrand").value.trim(),professional:$("#cfgProfessional").value.trim()||defaultData.settings.professional,whatsapp:cleanPhone($("#cfgWhats").value),instagram:$("#cfgInstagram").value.trim(),confirmationObs:$("#cfgObs").value.trim()||defaultData.settings.confirmationObs,address:$("#cfgAddress").value.trim(),hours:$("#cfgHours").value.trim(),weeklyHours,interval:Number($("#cfgInterval").value)||30};delete data.settings.open;delete data.settings.close;await persist();toast("Configurações salvas")};
    }
