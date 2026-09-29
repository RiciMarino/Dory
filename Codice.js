/** Dory mail gateway. Deploy as ricimarino@gmail.com, execute as me. */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var data = JSON.parse(e.postData.contents || '{}');
    var properties = PropertiesService.getScriptProperties();
    var secret = properties.getProperty('DORY_CONFIRMATION_TOKEN');
    if (!secret || data.token !== secret) return reply_({ok:false,error:'unauthorized'});
    if (Session.getEffectiveUser().getEmail().toLowerCase() !== 'ricimarino@gmail.com') return reply_({ok:false,error:'wrong-owner'});

    var type = String(data.type || 'confirmation');
    var emailRequired = type !== 'cancellation' && type !== 'manager-confirmation';
    if (!/^[0-9a-f-]{36}$/i.test(String(data.id || '')) ||
        (emailRequired && !/^\S+@\S+\.\S+$/.test(String(data.email || ''))) ||
        !data.name || !data.offer || !(Number(data.people) > 0)) {
      return reply_({ok:false,error:'invalid-booking'});
    }

    var id = String(data.id);
    var email = String(data.email || '').toLowerCase();
    var people = Number(data.people);
    var peopleText = people + (people === 1 ? ' persona' : ' persone');

    if (type === 'cancellation') {
      var managerKey = 'cancelled-managers:' + id;
      var guestKey = 'cancelled-guest:' + id;
      if (!properties.getProperty(managerKey)) {
        sendDoryMail_({
          to: 'ricimarino@gmail.com,giuseppeucci8@gmail.com',
          subject: 'Dory · Prenotazione cancellata: ' + data.name,
          eyebrow: 'GESTIONE EQUIPAGGIO',
          title: 'Prenotazione cancellata',
          intro: 'Ric e Peppe, la prenotazione è stata cancellata dalla Gestione equipaggio.',
          rows: [['Nome', data.name], ['Uscita', data.offer], ['Persone', peopleText], ['Email ospite', email || 'non indicata']],
          notice: 'Il posto è di nuovo disponibile. L’invito individuale e il riepilogo Calendar saranno aggiornati dalla sincronizzazione periodica.',
          noticeTone: 'orange'
        });
        properties.setProperty(managerKey, new Date().toISOString());
      }
      if (email && !properties.getProperty(guestKey)) {
        sendDoryMail_({
          to: email,
          subject: 'Dory · La tua prenotazione è stata cancellata',
          eyebrow: 'DORY',
          title: 'Cambio di rotta',
          intro: 'Ciao ' + data.name + ', Ric e Peppe hanno cancellato la tua prenotazione.',
          rows: [['Uscita', data.offer], ['Persone', peopleText]],
          paragraphs: ['Il relativo invito verrà rimosso dal calendario.', 'Se ti va di protestare, fuori bordo puoi perfino insultare i Comandanti: a bordo la loro parola è legge, ma qui puoi sbizzarrirti rispondendo a questa email.'],
          notice: 'Cancellazione registrata',
          noticeTone: 'orange',
          signoff: 'Ric e Peppe'
        });
        properties.setProperty(guestKey, new Date().toISOString());
      }
      return reply_({ok:true});
    }

    if (type === 'manager-confirmation') {
      var confirmedKey = 'confirmed-managers:' + id;
      if (properties.getProperty(confirmedKey)) return reply_({ok:true,alreadySent:true});
      var who = data.addedBy === 'peppe' ? 'Peppe' : data.addedBy === 'ric' ? 'Ric' : 'Gestione equipaggio';
      sendDoryMail_({
        to: 'ricimarino@gmail.com,giuseppeucci8@gmail.com',
        subject: 'Dory · Equipaggio confermato: ' + data.name,
        eyebrow: 'GESTIONE EQUIPAGGIO',
        title: 'Posto confermato',
        intro: who + ' ha aggiunto e confermato una prenotazione dalla Gestione equipaggio.',
        rows: [['Nome', data.name], ['Uscita', data.offer], ['Persone', peopleText], ['Email ospite', email || 'non indicata']],
        notice: 'Conferma registrata. Il riepilogo e l’evento individuale Calendar saranno aggiornati dalla sincronizzazione periodica.',
        noticeTone: 'green'
      });
      properties.setProperty(confirmedKey, new Date().toISOString());
      return reply_({ok:true});
    }

    if (type === 'new-request') {
      var noticeKey = 'notified:' + id;
      if (properties.getProperty(noticeKey)) return reply_({ok:true,alreadySent:true});
      sendDoryMail_({
        to: 'ricimarino@gmail.com,giuseppeucci8@gmail.com',
        subject: 'Dory · Nuova richiesta di imbarco: ' + data.name,
        eyebrow: 'NUOVA RICHIESTA',
        title: 'Qualcuno vuole salire a bordo',
        intro: 'È arrivata una nuova richiesta di imbarco su Dory.',
        rows: [['Nome', data.name], ['Uscita', data.offer], ['Persone', peopleText], ['Email', email], ['Note', data.message || 'Nessuna']],
        notice: 'La richiesta è in attesa: aprite Gestione equipaggio sul sito Dory per valutarla.',
        noticeTone: 'orange'
      });
      properties.setProperty(noticeKey, new Date().toISOString());
      return reply_({ok:true});
    }

    if (type !== 'confirmation') return reply_({ok:false,error:'invalid-type'});
    var key = 'sent:' + id + ':' + email;
    if (properties.getProperty(key)) return reply_({ok:true,alreadySent:true});
    sendDoryMail_({
      to: email,
      subject: 'Dory · Conferma imbarco: ' + data.name,
      eyebrow: 'UN POSTO PER TE A BORDO',
      title: 'Prenotazione confermata',
      intro: 'Ciao ' + data.name + ', com’è dolce navigar in questo mar… soprattutto con un posto su Dory! Il tuo è confermato.',
      rows: [['Uscita', data.offer], ['Persone', peopleText]],
      paragraphs: [
        'Poi, come si dice dalle parti di Napoli, «A mare calmo ogni strunz è marinaio». Quindi niente promesse fatte al meteo: nei tre giorni prima della partenza guardiamo previsioni e condizioni del mare. La decisione se salpare spetta ai Comandanti, Ric e Peppe. Orario, punto d’imbarco e cambi di programma ve li comunichiamo noi.',
        'Per salire a bordo servono la tessera sportiva AICS (10 €) e il certificato medico non agonistico. Se vi va, potete lasciare anche un contributo volontario per Dory. Per la parte pratica vi mandiamo tutte le indicazioni prima dell’uscita: niente panico, per ora preparate solo la voglia di mare.'
      ],
      notice: 'Posto confermato · mare permettendo!',
      noticeTone: 'green',
      signoff: 'A presto a bordo!<br>Ric e Peppe'
    });
    properties.setProperty(key, new Date().toISOString());
    return reply_({ok:true});
  } catch (err) {
    return reply_({ok:false,error:String(err)});
  } finally {
    lock.releaseLock();
  }
}

function sendDoryMail_(o) {
  var plain = (o.title || 'Dory') + '\n\n' + (o.intro || '') + '\n\n';
  (o.rows || []).forEach(function(r){ plain += r[0] + ': ' + r[1] + '\n'; });
  (o.paragraphs || []).forEach(function(p){ plain += '\n' + p + '\n'; });
  if (o.notice) plain += '\n' + o.notice + '\n';
  if (o.signoff) plain += '\n' + String(o.signoff).replace(/<br\s*\/?\s*>/gi, '\n') + '\n';

  MailApp.sendEmail({
    to: o.to,
    subject: o.subject,
    body: plain,
    htmlBody: doryEmailHtml_(o),
    name: 'Ric e Peppe'
  });
}

function doryEmailHtml_(o) {
  var esc = function(v) {
    return String(v == null ? '' : v)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  };
  var rows = (o.rows || []).map(function(r) {
    return '<tr><td style="padding:8px 12px 8px 0;vertical-align:top;font-size:14px;line-height:20px;color:#63777b;width:115px;">' + esc(r[0]) + '</td>' +
      '<td style="padding:8px 0;vertical-align:top;font-size:15px;line-height:21px;color:#15363c;font-weight:700;overflow-wrap:anywhere;word-break:break-word;">' + esc(r[1]) + '</td></tr>';
  }).join('');
  var paragraphs = (o.paragraphs || []).map(function(p) {
    return '<p style="margin:0 0 18px;font-size:16px;line-height:25px;color:#29484d;">' + esc(p) + '</p>';
  }).join('');
  var tone = o.noticeTone === 'orange'
    ? 'background:#fff2e4;border:1px solid #f3a052;color:#70410f;'
    : 'background:#eaf6f1;border:1px solid #9ccfba;color:#174c3a;';
  var notice = o.notice ? '<div style="margin:22px 0 4px;padding:15px 17px;border-radius:12px;font-size:15px;line-height:22px;font-weight:700;' + tone + '">' + esc(o.notice) + '</div>' : '';
  var signoff = o.signoff ? '<p style="margin:24px 0 0;font-size:16px;line-height:24px;color:#15363c;font-weight:700;">' + String(o.signoff) + '</p>' : '';

  return '<!doctype html><html><body style="margin:0;padding:0;background:#f3f7f6;">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f3f7f6;margin:0;padding:0;"><tr><td align="center" style="padding:24px 12px;">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:18px;border:1px solid #d9e7e4;">' +
    '<tr><td style="padding:28px 28px 12px;font-family:Arial,Helvetica,sans-serif;">' +
    '<div style="font-size:12px;line-height:16px;letter-spacing:1.2px;font-weight:700;color:#e88936;">' + esc(o.eyebrow || 'DORY') + '</div>' +
    '<h1 style="margin:7px 0 12px;font-size:27px;line-height:33px;color:#15363c;font-weight:700;">' + esc(o.title || 'Dory') + '</h1>' +
    '<p style="margin:0;font-size:16px;line-height:25px;color:#29484d;">' + esc(o.intro || '') + '</p>' +
    '</td></tr>' +
    (rows ? '<tr><td style="padding:10px 28px 14px;font-family:Arial,Helvetica,sans-serif;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-top:1px solid #e2ecea;border-bottom:1px solid #e2ecea;">' + rows + '</table></td></tr>' : '') +
    '<tr><td style="padding:10px 28px 30px;font-family:Arial,Helvetica,sans-serif;">' + paragraphs + notice + signoff + '</td></tr>' +
    '</table>' +
    '<div style="max-width:600px;margin:12px auto 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:16px;color:#809296;text-align:center;">Dory · Ric e Peppe</div>' +
    '</td></tr></table></body></html>';
}

function reply_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
