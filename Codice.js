/** Dory mail gateway. Deploy as ricimarino@gmail.com, execute as me. */
function doPost(e) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var data=JSON.parse(e.postData.contents||'{}'),properties=PropertiesService.getScriptProperties(),secret=properties.getProperty('DORY_CONFIRMATION_TOKEN');
    if(!secret||data.token!==secret)return reply_({ok:false,error:'unauthorized'});
    if(Session.getEffectiveUser().getEmail().toLowerCase()!=='ricimarino@gmail.com')return reply_({ok:false,error:'wrong-owner'});
    var type=String(data.type||'confirmation'),emailRequired=type!=='cancellation'&&type!=='manager-confirmation';
    if(!/^[0-9a-f-]{36}$/i.test(String(data.id||''))||(emailRequired&&!/^\S+@\S+\.\S+$/.test(String(data.email||'')))||!data.name||!data.offer||!(Number(data.people)>0))return reply_({ok:false,error:'invalid-booking'});
    var id=String(data.id),email=String(data.email||'').toLowerCase(),people=Number(data.people),peopleText=people+(people===1?' persona':' persone');
    if(type==='cancellation'){
      var managerKey='cancelled-managers:'+id,guestKey='cancelled-guest:'+id;
      if(!properties.getProperty(managerKey)){sendDoryMail_({to:'ricimarino@gmail.com,giuseppeucci8@gmail.com',subject:'Dory · Prenotazione cancellata: '+data.name,eyebrow:'GESTIONE EQUIPAGGIO',title:'Prenotazione cancellata',intro:'Ric e Peppe, la prenotazione è stata cancellata dalla Gestione equipaggio.',rows:[['Nome',data.name],['Uscita',data.offer],['Persone',peopleText],['Email ospite',email||'non indicata']],notice:'Il posto è di nuovo disponibile. Calendar verrà aggiornato dalla sincronizzazione.',noticeTone:'orange'});properties.setProperty(managerKey,new Date().toISOString());}
      if(email&&!properties.getProperty(guestKey)){sendDoryMail_({to:email,subject:'Dory · La tua prenotazione è stata cancellata',eyebrow:'DORY',title:'Cambio di rotta',intro:'Ciao '+data.name+', Ric e Peppe hanno cancellato la tua prenotazione.',rows:[['Uscita',data.offer],['Persone',peopleText]],paragraphs:['L’invito verrà rimosso dal calendario. Se vuoi protestare, fuori bordo puoi perfino insultare i Comandanti: a bordo la loro parola è legge, qui puoi sbizzarrirti rispondendo alla mail.'],notice:'Cancellazione registrata',noticeTone:'orange',signoff:'Ric e Peppe'});properties.setProperty(guestKey,new Date().toISOString());}
      return reply_({ok:true});
    }
    if(type==='manager-confirmation'){
      var confirmedKey='confirmed-managers:'+id;if(properties.getProperty(confirmedKey))return reply_({ok:true,alreadySent:true});
      var who=data.addedBy==='peppe'?'Peppe':data.addedBy==='ric'?'Ric':'Gestione equipaggio';
      sendDoryMail_({to:'ricimarino@gmail.com,giuseppeucci8@gmail.com',subject:'Dory · Equipaggio confermato: '+data.name,eyebrow:'GESTIONE EQUIPAGGIO',title:'Posto confermato',intro:who+' ha aggiunto e confermato una prenotazione dalla Gestione equipaggio.',rows:[['Nome',data.name],['Uscita',data.offer],['Persone',peopleText],['Email ospite',email||'non indicata']],notice:'Conferma registrata. Calendar verrà aggiornato dalla sincronizzazione.',noticeTone:'green'});properties.setProperty(confirmedKey,new Date().toISOString());return reply_({ok:true});
    }
    if(type==='new-request'){
      var noticeKey='notified:'+id;if(properties.getProperty(noticeKey))return reply_({ok:true,alreadySent:true});
      sendDoryMail_({to:'ricimarino@gmail.com,giuseppeucci8@gmail.com',subject:'Dory · Nuova richiesta di imbarco: '+data.name,eyebrow:'NUOVA RICHIESTA',title:'Qualcuno vuole salire a bordo',intro:'È arrivata una nuova richiesta di imbarco su Dory.',rows:[['Nome',data.name],['Uscita',data.offer],['Persone',peopleText],['Email',email],['Note',data.message||'Nessuna']],notice:'Richiesta da confermare nella Gestione equipaggio.',noticeTone:'orange'});properties.setProperty(noticeKey,new Date().toISOString());return reply_({ok:true});
    }
    if(type!=='confirmation')return reply_({ok:false,error:'invalid-type'});
    var key='sent:'+id+':'+email;if(properties.getProperty(key))return reply_({ok:true,alreadySent:true});
    sendDoryMail_({to:email,subject:'Dory · Conferma imbarco: '+data.name,eyebrow:'UN POSTO PER TE A BORDO',title:'Prenotazione confermata',intro:'Ciao '+data.name+', il tuo posto su Dory è confermato.',rows:[['Uscita',data.offer],['Persone',peopleText]],paragraphs:['Come si dice dalle parti di Napoli, «A mare calmo ogni strunz è marinaio». Nei tre giorni prima della partenza guardiamo meteo e condizioni del mare: la decisione di salpare spetta a Ric e Peppe. Orario, imbarco ed eventuali cambi ve li comunichiamo noi.','Per salire a bordo servono tessera sportiva AICS (10 €) e certificato medico non agonistico. Il contributo per Dory è volontario.'],notice:'Posto confermato · mare permettendo!',noticeTone:'green',signoff:'A presto a bordo!<br>Ric e Peppe'});properties.setProperty(key,new Date().toISOString());return reply_({ok:true});
  }catch(err){return reply_({ok:false,error:String(err)});}finally{lock.releaseLock();}
}
function sendDoryMail_(o){var plain=(o.title||'Dory')+'\n\n'+(o.intro||'')+'\n\n';(o.rows||[]).forEach(function(r){plain+=r[0]+': '+r[1]+'\n';});(o.paragraphs||[]).forEach(function(p){plain+='\n'+p+'\n';});if(o.notice)plain+='\n'+o.notice+'\n';if(o.signoff)plain+='\n'+String(o.signoff).replace(/<br\s*\/?\s*>/gi,'\n')+'\n';MailApp.sendEmail({to:o.to,subject:o.subject,body:plain,htmlBody:doryEmailHtml_(o),name:'Ric e Peppe'});}
function doryEmailHtml_(o){
  var esc=function(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');};
  var rows=(o.rows||[]).map(function(r){return '<tr><td style="padding:6px 10px 6px 0;font:12px Arial,sans-serif;color:#718487;text-transform:uppercase;vertical-align:top;white-space:nowrap;">'+esc(r[0])+'</td><td style="padding:6px 0;font:bold 15px Arial,sans-serif;color:#15363c;vertical-align:top;word-break:break-word;">'+esc(r[1])+'</td></tr>';}).join('');
  var paragraphs=(o.paragraphs||[]).map(function(p){return '<p style="margin:0 0 12px;font:15px/1.45 Arial,sans-serif;color:#29484d;">'+esc(p)+'</p>';}).join('');
  var tone=o.noticeTone==='orange'?'#fff1df':'#e8f5ef',border=o.noticeTone==='orange'?'#ef9b52':'#86c5ad',ink=o.noticeTone==='orange'?'#70410f':'#174c3a';
  var notice=o.notice?'<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:14px;"><tr><td style="padding:11px 13px;background:'+tone+';border:2px solid '+border+';border-radius:8px;font:bold 14px/1.4 Arial,sans-serif;color:'+ink+';">'+esc(o.notice)+'</td></tr></table>':'';
  var signoff=o.signoff?'<p style="margin:16px 0 0;font:bold 15px/1.4 Arial,sans-serif;color:#15363c;">'+String(o.signoff)+'</p>':'';
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#ffffff;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="padding:12px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:560px;"><tr><td style="padding:0 0 6px;font:bold 11px Arial,sans-serif;letter-spacing:1px;color:#e88936;">'+esc(o.eyebrow||'DORY')+'</td></tr><tr><td style="padding:0 0 8px;font:bold 22px/1.2 Arial,sans-serif;color:#15363c;">'+esc(o.title||'Dory')+'</td></tr><tr><td style="padding:0 0 12px;font:15px/1.45 Arial,sans-serif;color:#29484d;">'+esc(o.intro||'')+'</td></tr>'+(rows?'<tr><td style="padding:0 0 12px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0">'+rows+'</table></td></tr>':'')+'<tr><td>'+paragraphs+notice+signoff+'</td></tr><tr><td style="padding-top:16px;font:11px Arial,sans-serif;color:#809296;">Dory · Ric e Peppe</td></tr></table></td></tr></table></body></html>';
}
function reply_(data){return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);}
