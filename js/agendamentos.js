/* agendamentos.js — fluxo do agendamento: mensagens de WhatsApp, agenda de horários e assistente (wizard). */
    /* Mensagens padronizadas do sistema. Elas são abertas prontas no WhatsApp
       do próprio aparelho (wa.me) — nenhuma API ou servidor externo é necessário. */
    function effectiveNotes(booking){return booking.notes||data.settings.confirmationObs||""}
    function confirmationMessage(booking){
      const notes=effectiveNotes(booking)?`\n📝 Observações: ${effectiveNotes(booking)}\n`:"";
      return `✂️ AGENDAMENTO CONFIRMADO\n\nOlá, ${booking.name}!\n\nSeu agendamento na ${data.settings.brand} foi confirmado.\n\n📅 Data: ${formatDateNumeric(booking.date)}\n🕐 Horário: ${booking.time}\n✂️ Serviço: ${booking.serviceName}\n💈 Profissional: ${data.settings.professional}\n💰 Valor: ${money(booking.price)}\n\n📍 Endereço:\n${data.settings.address}\n${notes}\nSeu horário está reservado.\n\nObrigado pela preferência!`;
    }
    /* Aviso enviado ao barbeiro com os dados do cliente. */
    function ownerMessage(booking){
      const obs=effectiveNotes(booking),observation=obs?`\n📝 Observações: ${obs}\n`:"";
      return `🔔 NOVO AGENDAMENTO\n\nCliente: ${booking.name}\n📱 WhatsApp: ${formatPhone(booking.phone)}\n\n📅 Data: ${formatDateNumeric(booking.date)}\n🕐 Horário: ${booking.time}\n✂️ Serviço: ${booking.serviceName}\n💈 Profissional: ${data.settings.professional}\n💰 Valor: ${money(booking.price)}\n\n📍 Endereço:\n${data.settings.address}\n${observation}\n🔔 Novo horário reservado pelo cliente.`;
    }
    function copyMessage(text){if(navigator.clipboard?.writeText)navigator.clipboard.writeText(text).then(()=>toast("Mensagem copiada")).catch(()=>toast("Não foi possível copiar a mensagem"));else toast("Cópia não suportada neste navegador")}
    function openWhatsapp(phone,message){const n=whatsappPhone(phone);if(n.length<12){toast("Número de WhatsApp inválido");return false}const win=window.open(`https://wa.me/${n}${message?`?text=${encodeURIComponent(message)}`:""}`,"_blank","noopener");if(!win){toast("O navegador bloqueou a janela do WhatsApp. Libere pop-ups e tente de novo.");return false}return true}
    /* ============================================================
       ENVIO 100% LOCAL — sem Render, sem Evolution API e sem qualquer
       serviço externo. As mensagens padronizadas são abertas na
       conversa do WhatsApp pelo próprio aparelho; basta tocar em enviar.
       ============================================================ */
    function standardMessage(booking,recipient,eventType="booking"){
      const cancellation=eventType==="cancellation";
      if(recipient==="client")return cancellation?`AGENDAMENTO CANCELADO\n\nOlá, ${booking.name}.\n\nSeu agendamento na ${data.settings.brand} foi cancelado.\n\n📅 Data: ${formatDateNumeric(booking.date)}\n🕐 Horário: ${booking.time}\n✂️ Serviço: ${booking.serviceName}\n💈 Profissional: ${data.settings.professional}\n\nSe quiser marcar um novo horário, estamos à disposição.`:confirmationMessage(booking);
      return cancellation?`🔔 AGENDAMENTO CANCELADO\n\nCliente: ${booking.name}\n📱 WhatsApp: ${formatPhone(booking.phone)}\n📅 Data: ${formatDateNumeric(booking.date)}\n🕐 Horário: ${booking.time}\n✂️ Serviço: ${booking.serviceName}\n\nO horário foi liberado novamente na agenda.`:ownerMessage(booking);
    }
    async function deliverBookingMessages(booking,options={}){
      const eventType=options.eventType||"booking",target=options.target||"both";
      const recipients=target==="both"?["client","owner"]:[target],deliveries={};
      for(const recipient of recipients){
        const phone=recipient==="client"?booking.phone:data.settings.whatsapp,label=recipient==="client"?"seu WhatsApp":"WhatsApp da barbearia";
        if(cleanPhone(phone).length<10){deliveries[recipient]={recipient,attempted:true,sent:false,error:`${label} não está configurado.`};continue}
        const ok=openWhatsapp(phone,standardMessage(booking,recipient,eventType));
        deliveries[recipient]=ok
          ?{recipient,attempted:true,sent:true,sentAt:new Date().toISOString()}
          :{recipient,attempted:true,sent:false,error:`Autorize a abertura do ${label} neste navegador e tente novamente.`};
      }
      const sentCount=recipients.filter(recipient=>deliveries[recipient].sent).length;
      return {bookingId:booking.id,eventType,status:sentCount===recipients.length?"sent":sentCount?"partial":"failed",deliveries};
    }
    function applyDeliveryResult(booking,result,eventType="booking"){
      const cancellation=eventType==="cancellation",clientField=cancellation?"cancellationNotifiedClient":"notifiedClient",ownerField=cancellation?"cancellationNotifiedOwner":"notifiedOwner",statusField=cancellation?"cancellationNotificationStatus":"notificationStatus",errorField=cancellation?"cancellationNotificationError":"notificationError",sentAtField=cancellation?"cancellationNotificationSentAt":"notificationSentAt";
      const errors=typeof booking[errorField]==="object"&&booking[errorField]?{...booking[errorField]}:{};
      for(const recipient of ["client","owner"]){const delivery=result?.deliveries?.[recipient];if(!delivery?.attempted)continue;const field=recipient==="client"?clientField:ownerField;booking[field]=Boolean(delivery.sent);if(delivery.sent){delete errors[recipient];booking[`${field}At`]=delivery.sentAt||new Date().toISOString()}else errors[recipient]=delivery.error||"Falha no envio."}
      const sent=[booking[clientField],booking[ownerField]].filter(Boolean).length;
      booking[statusField]=sent===2?"sent":sent===1?"partial":"failed";
      booking[errorField]=Object.keys(errors).length?errors:null;
      if(sent)booking[sentAtField]=new Date().toISOString();
      booking.updatedAt=new Date().toISOString();
    }
    function timeToMinutes(time){const [hours,minutes]=String(time||"").split(":").map(Number);return hours*60+minutes}
    function intervalsOverlap(startA,endA,startB,endB){return startA<endB&&endA>startB}
    function scheduleForDate(date){const day=String(new Date(date+"T12:00:00").getDay()),schedule=data.settings.weeklyHours?.[day];if(!schedule||schedule.closed)return [];return (schedule.periods||[]).filter(p=>p.start&&p.end&&p.start<p.end).map(p=>[p.start,p.end])}
    function blockAppliesOnDate(block,date){const start=block.startDate||block.date,end=block.endDate||block.date;return Boolean(start&&end&&date>=start&&date<=end)}
    function getSlots(date,duration){
      const step=Number(data.settings.interval)||30,slotDuration=Math.max(1,Number(duration)||step),booked=Object.values(data.bookings).filter(b=>b.date===date&&b.status!=="cancelled"),blocked=Object.values(data.blocks).filter(b=>blockAppliesOnDate(b,date)),out=[],seen=new Set(),periods=scheduleForDate(date);
      periods.forEach(([start,end])=>{const periodStart=timeToMinutes(start),periodEnd=timeToMinutes(end);for(let mins=periodStart;mins<periodEnd;mins+=step){const time=`${String(Math.floor(mins/60)).padStart(2,"0")}:${String(mins%60).padStart(2,"0")}`;if(seen.has(time))continue;seen.add(time);const slotEnd=mins+slotDuration,fitsPeriod=slotEnd<=periodEnd,busyBooking=booked.some(b=>{const bookingStart=timeToMinutes(b.time),service=data.services[b.serviceId],bookingDuration=Math.max(1,Number(b.duration)||Number(service?.duration)||step);return intervalsOverlap(mins,slotEnd,bookingStart,bookingStart+bookingDuration)}),busyBlock=blocked.some(b=>{const blockStart=timeToMinutes(b.time),blockDuration=Math.max(1,Number(b.duration)||step);return intervalsOverlap(mins,slotEnd,blockStart,blockStart+blockDuration)});out.push({time,busy:!fitsPeriod||busyBooking||busyBlock})}});return out.sort((a,b)=>a.time.localeCompare(b.time));
    }
    function renderSteps(){$("#steps").innerHTML=[1,2,3,4,5].map(i=>`<span class="step-dot ${i===wizardStep?"active":i<wizardStep?"done":""}"></span>`).join("")}
    function renderWizard(){
      renderSteps();const w=$("#wizard"),service=data.services[draft.serviceId];
      if(wizardStep===1)w.innerHTML=`<div class="step-label">Passo 1 de 5 · Serviço</div><h3>O que vamos fazer?</h3><div class="choice-grid">${Object.values(data.services).map(s=>`<button class="choice ${draft.serviceId===s.id?"selected":""}" data-service="${s.id}">${serviceImage(s)?`<img class="choice-photo" src="${esc(serviceImage(s))}" alt="">`:""}<strong>${esc(s.name)}</strong><small>${s.duration} minutos</small><span class="price">${money(s.price)}</span></button>`).join("")}</div><div class="wizard-actions"><span></span><button class="btn btn-dark" id="nextWizard" ${!draft.serviceId?"disabled":""}>Escolher data →</button></div>`;
      if(wizardStep===2)w.innerHTML=`<div class="step-label">Passo 2 de 5 · Data</div><h3>Qual é o melhor dia?</h3><div class="field"><label for="bookingDate">Data do atendimento</label><input class="input" id="bookingDate" type="date" min="${todayISO()}" value="${draft.date||todayISO()}"></div><div class="wizard-actions"><button class="btn btn-ghost" id="prevWizard">← Voltar</button><button class="btn btn-dark" id="nextWizard">Ver horários →</button></div>`;
      if(wizardStep===3){const slots=getSlots(draft.date,service.duration);w.innerHTML=`<div class="step-label">Passo 3 de 5 · Horário</div><h3>Escolha uma vaga livre.</h3><p style="color:var(--muted)">${formatDate(draft.date)} · ${esc(service.name)} · ${service.duration} min</p>${slots.length?`<div class="time-grid">${slots.map(s=>`<button class="time-slot ${draft.time===s.time?"selected":""}" data-time="${s.time}" ${s.busy?"disabled":""}>${s.time}</button>`).join("")}</div>`:'<div class="empty">Não há expediente configurado para este dia.</div>'}<div class="wizard-actions"><button class="btn btn-ghost" id="prevWizard">← Voltar</button><button class="btn btn-dark" id="nextWizard" ${!draft.time?"disabled":""}>Seus dados →</button></div>`}
      if(wizardStep===4)w.innerHTML=`<div class="step-label">Passo 4 de 5 · Cliente</div><h3>Como podemos confirmar?</h3><div class="form-grid"><div class="field"><label>Seu nome</label><input class="input" id="draftName" autocomplete="name" value="${esc(draft.name)}" placeholder="Nome completo"></div><div class="field"><label>WhatsApp / telefone</label><input class="input" id="draftPhone" inputmode="tel" autocomplete="tel" value="${esc(draft.phone)}" placeholder="(00) 00000-0000"></div><div id="returningClientHint" class="hidden"></div><div class="field full"><label>Preferências do corte</label><textarea class="input" id="draftNotes" placeholder="Ex.: máquina 2 nas laterais, tesoura em cima...">${esc(draft.notes)}</textarea></div></div><div class="wizard-actions"><button class="btn btn-ghost" id="prevWizard">← Voltar</button><button class="btn btn-dark" id="nextWizard">Revisar →</button></div>`;
      if(wizardStep===5)w.innerHTML=`<div class="step-label">Passo 5 de 5 · Confirmar</div><h3>Está tudo certo?</h3><div class="summary-card"><div class="summary-item"><small>Serviço</small><strong>${esc(service.name)}</strong></div><div class="summary-item"><small>Valor</small><strong>${money(service.price)}</strong></div><div class="summary-item"><small>Data e hora</small><strong>${formatDate(draft.date)} · ${draft.time}</strong></div><div class="summary-item"><small>Cliente</small><strong>${esc(draft.name)}</strong></div></div><div class="wizard-actions"><button class="btn btn-ghost" id="prevWizard">← Corrigir</button><button class="btn btn-copper" id="confirmBooking">Confirmar agendamento</button></div>`;
      bindWizard();
    }
    function bindWizard(){
      $$('[data-service]').forEach(b=>b.onclick=()=>{draft.serviceId=b.dataset.service;renderWizard()});
      $$('[data-time]').forEach(b=>b.onclick=()=>{draft.time=b.dataset.time;renderWizard()});
      const phoneInput=$("#draftPhone");if(phoneInput){phoneInput.addEventListener("input",()=>{phoneInput.value=maskPhone(phoneInput.value);showReturningClient(phoneInput.value)});showReturningClient(phoneInput.value)}
      const next=$("#nextWizard"),prev=$("#prevWizard");if(prev)prev.onclick=()=>{wizardStep--;renderWizard()};
      if(next)next.onclick=()=>{
        if(wizardStep===2){const selectedDate=$("#bookingDate").value;if(!selectedDate)return toast("Escolha uma data");if(selectedDate!==draft.date)draft.time="";draft.date=selectedDate}
        if(wizardStep===4){draft.name=$("#draftName").value.trim();draft.phone=$("#draftPhone").value.trim();draft.notes=$("#draftNotes").value.trim();if(!draft.name||cleanPhone(draft.phone).length<10)return toast("Informe nome e telefone válidos")}
        wizardStep++;renderWizard();
      };
      const confirm=$("#confirmBooking");if(confirm)confirm.onclick=confirmBooking;
    }
    function showReturningClient(phone){
      const hint=$("#returningClientHint");if(!hint)return;const items=clientBookings(phone),valid=phoneKey(phone).length>=10;
      if(!valid||!items.length){hint.className="hidden";hint.innerHTML="";return}
      const latest=[...items].sort((a,b)=>(b.createdAt||b.date).localeCompare(a.createdAt||a.date))[0],active=items.filter(b=>b.status!=="cancelled"&&b.status!=="completed"&&b.date>=todayISO()).length,name=$("#draftName");
      if(name&&!name.value)name.value=latest.name;
      hint.className="returning-client";hint.innerHTML=`<div><strong>Olá novamente, ${esc(latest.name.split(" ")[0])}.</strong><p>Contato encontrado: ${formatPhone(latest.phone)} · ${active?`${active} agendamento(s) ativo(s)`:"nenhum horário ativo"}.</p></div><button class="mini whatsapp" type="button" id="openExistingBookings">Ver meus horários</button>`;
      $("#openExistingBookings").onclick=()=>{$("#clientPhone").value=formatPhone(latest.phone);renderClientResults();closeOverlay("bookingOverlay");openOverlay("clientOverlay")};
    }
    async function confirmBooking(){
      const s=data.services[draft.serviceId];
      const selectedSlot=getSlots(draft.date,s.duration).find(slot=>slot.time===draft.time);
      if(!selectedSlot||selectedSlot.busy)return toast("Este horário não está mais disponível. Escolha outro.");
      /* Janela do WhatsApp capturada ainda dentro do clique — abre na hora, sem bloqueio. */
      const whatsappTab=window.open("about:blank","_blank");
      const id=uid(),now=new Date().toISOString();
      const registro={id,...draft,phone:cleanPhone(draft.phone),serviceName:s.name,duration:s.duration,price:Number(s.price),status:"confirmed",createdAt:now,confirmedAt:now,notifiedClient:false,notifiedOwner:false,notificationStatus:"pending",notificationError:null};
      data.bookings[id]=registro;
      try{await persist()}catch(error){whatsappTab?.close();delete data.bookings[id];console.error("Falha ao salvar agendamento",error);return toast("Não foi possível salvar no Firebase. O horário não foi confirmado.")}
      const booking=data.bookings[id]||registro;
      renderBarberStep(booking);
      /* 1º envio: confirmação do cliente abre sozinha (mensagem padrão). */
      const link=whatsAppUrlFor(booking.phone,confirmationMessage(booking));
      if(link){
        if(whatsappTab&&!whatsappTab.closed){try{whatsappTab.opener=null;whatsappTab.location.replace(link)}catch(error){}}
        else window.open(link,"_blank");
      } else whatsappTab?.close();
      focusWhatsAppTab(whatsappTab,link);
      markStageSent(booking,"client");
    }
    function whatsAppUrlFor(phone,message){const n=whatsappPhone(phone);return n.length<12?"":`https://wa.me/${n}${message?`?text=${encodeURIComponent(message)}`:""}`}
    /* Quando o WhatsApp abre numa aba separada, o app tenta trazer o cliente de volta. */
    function focusWhatsAppTab(tab,finalUrl){
      if(!tab||tab.closed)return;
      let goesExternal=false;
      try{goesExternal=(tab.location.href.startsWith("http:")||tab.location.href.startsWith("https:"))&&tab.location.href!==finalUrl}catch(error){}
      if(goesExternal)return;
      try{tab.focus()}catch(error){}
      setTimeout(()=>{try{tab.focus()}catch(error){}},80);
    }
    function markStageSent(booking,recipient){
      const current=data.bookings[booking.id]||booking;
      if(recipient==="client")current.notifiedClient=true;else current.notifiedOwner=true;
      const sent=[current.notifiedClient,current.notifiedOwner].filter(Boolean).length;
      current.notificationStatus=sent===2?"sent":sent===1?"partial":"pending";
      current.updatedAt=new Date().toISOString();
      persist().catch(error=>console.error("Falha ao registrar status do WhatsApp",error));
    }
    /* Tela curta: ao voltar do WhatsApp, só o botão de avisar o barbeiro. */
    function renderBarberStep(booking){
      $("#steps").innerHTML="";
      $("#bookingTitle").textContent="Quase lá!";
      $("#wizard").innerHTML=`<div class="success-view single-action">
        <svg class="stage-check whatsapp-check" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3A13 13 0 0 0 4.6 22.3L3 29l6.9-1.6A13 13 0 1 0 16 3Z" fill="#dcefe4" stroke="#17613b" stroke-width="1.4"/><path d="M10.6 15.6l3.1 3.2 6.7-6.9" fill="none" stroke="#17613b" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <h3>Confirme agora para o barbeiro receber seu agendamento</h3>
        <button class="btn btn-copper btn-barber" id="confirmOwnerSend"><span class="btn-barber-label">Confirmar e enviar</span></button>
      </div>`;
      $("#confirmOwnerSend").onclick=()=>sendToBarber(booking);
    }
    function sendToBarber(booking){
      const button=$("#confirmOwnerSend");
      if(!button||button.disabled)return;
      const current=data.bookings[booking.id]||booking;
      if(cleanPhone(data.settings.whatsapp).length<10)return toast("O WhatsApp da barbearia ainda não foi cadastrado no painel.");
      button.disabled=true;
      const label=button.querySelector(".btn-barber-label");
      if(label)label.textContent="Enviando ao barbeiro…";
      /* WhatsApp abre imediatamente com a mensagem pronta, na mesma janela/aba. */
      const link=whatsAppUrlFor(data.settings.whatsapp,ownerMessage(current));
      const win=window.open(link,"_blank");
      if(!win){
        button.disabled=false;
        if(label)label.textContent="Confirmar e enviar";
        return toast("O navegador bloqueou a janela do WhatsApp. Tente novamente.");
      }
      /* O botão já foi clicado: some da tela. Ao voltar, só a mensagem de sucesso. */
      try{win.focus()}catch(error){}
      setTimeout(()=>{try{win.focus()}catch(error){}try{window.focus()}catch(error){}},80);
      renderConfirmedScreen();
      markStageSent(current,"owner");
    }
    /* Tela final: exclusivamente a mensagem de sucesso com a marca de lido do WhatsApp. */
    function renderConfirmedScreen(){
      $("#steps").innerHTML="";
      $("#bookingTitle").textContent="Tudo certo!";
      $("#wizard").innerHTML=`<div class="success-view single-action"><div class="success-icon">✓</div><h3>Seu agendamento foi confirmado com sucesso! <span class="read-ticks" role="img" aria-label="Mensagem lida"><svg viewBox="0 0 20 12"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1.6 6.4l3.1 3.2 6.1-7"/><path d="M9 8.2l1.7 1.6 6.6-7.6"/></g></svg></span></h3></div>`;
    }
    /* Abre as conversas imediatamente (dentro do gesto do clique) e registra o status. */
    async function sendBookingNow(booking,eventType="booking",target="both"){
      const result=await deliverBookingMessages(booking,{eventType,target});
      applyDeliveryResult(booking,result,eventType);
      persist().catch(error=>console.error("Falha ao registrar status do WhatsApp",error));
      return result;
    }
    function notificationToast(result,eventType,target){
      const label=eventType==="cancellation"?"cancelamento":"confirmação";
      if(result?.status==="sent")return target==="both"?`Conversas de ${label} abertas no WhatsApp — toque em enviar em cada uma.`:`Conversa de ${label} aberta no WhatsApp — toque em enviar.`;
      if(result?.status==="partial")return`Uma conversa de ${label} abriu; reenvie a outra pelo painel quando puder.`;
      return `Agendamento preservado; não foi possível abrir o WhatsApp agora. Libere pop-ups e tente novamente.`;
    }
    async function resendNotification(bookingId,eventType="booking",target="both"){
      const booking=data.bookings[bookingId];if(!booking)return false;
      const result=await sendBookingNow(booking,eventType,target);
      toast(notificationToast(result,eventType,target));
      if($("#adminOverlay").classList.contains("open"))renderAdmin();
      return result.status!=="failed";
    }
    async function cancelBooking(booking,actor="client"){
      const target=actor==="admin"?"client":"owner";
      booking.status="cancelled";booking.updatedAt=new Date().toISOString();booking.cancelledAt=booking.updatedAt;booking.cancellationNotifiedClient=false;booking.cancellationNotifiedOwner=false;booking.cancellationNotificationStatus="pending";booking.cancellationNotificationError=null;
      /* O WhatsApp abre dentro do toque de confirmar do cancelamento. */
      const result=await sendBookingNow(booking,"cancellation",target);
      try{await persist()}catch(error){console.error("Falha ao atualizar cancelamento",error)}
      toast(notificationToast(result,"cancellation",target));
      return result;
    }
