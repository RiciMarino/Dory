/** Dory mail gateway. Deploy as ricimarino@gmail.com, execute as me. */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var data = JSON.parse(e.postData.contents || '{}');
    var secret = PropertiesService.getScriptProperties().getProperty('DORY_CONFIRMATION_TOKEN');
    if (!secret || data.token !== secret) return reply_({ok:false,error:'unauthorized'});
    if (Session.getEffectiveUser().getEmail().toLowerCase() !== 'ricimarino@gmail.com')
      return reply_({ok:false,error:'wrong-owner'});
    if (!/^[0-9a-f-]{36}$/i.test(String(data.id || '')) ||
        (data.type !== 'cancellation' && !/^\S+@\S+\.\S+$/.test(String(data.email || ''))) ||
        !data.name || !data.offer || !(Number(data.people) > 0))
      return reply_({ok:false,error:'invalid-booking'});

    var properties = PropertiesService.getScriptProperties();
    if (data.type === 'cancellation') {
      var managerKey = 'cancelled-managers:' + data.id;
      var guestKey = 'cancelled-guest:' + data.id;
      var detail = String(data.name) + ' · ' + data.offer + ' · ' + Number(data.people) +
        (Number(data.people) === 1 ? ' persona' : ' persone');
      if (!properties.getProperty(managerKey)) {
        MailApp.sendEmail({
          to: 'ricimarino@gmail.com,giuseppeucci8@gmail.com',
          subject: 'Dory · Prenotazione cancellata: ' + data.name,
          body: 'Ric e Peppe,\n\nla prenotazione è stata cancellata dalla Gestione equipaggio.\n\n' +
            detail + '\nEmail ospite: ' + (data.email || 'non indicata') +
            '\n\nIl posto è di nuovo disponibile. L’invito individuale e il riepilogo Calendar saranno aggiornati dalla sincronizzazione periodica.',
          name: 'Ric e Peppe'
        });
        properties.setProperty(managerKey, new Date().toISOString());
      }
      if (data.email && !properties.getProperty(guestKey)) {
        MailApp.sendEmail({
          to: String(data.email).toLowerCase(),
          subject: 'Dory · La tua prenotazione è stata cancellata',
          body: 'Ciao ' + data.name + ',\n\nRic e Peppe hanno cancellato la tua prenotazione per ' +
            data.offer + ' (' + Number(data.people) + (Number(data.people) === 1 ? ' persona' : ' persone') + ').\n\n' +
            'Il relativo invito verrà rimosso dal calendario. Se vuoi chiarire o concordare un’altra uscita, rispondi pure a questa email. A bordo i Comandanti hanno sempre ragione; da terra puoi anche insultarci con tutta la fantasia che vuoi. Leggeremo tutto, promesso.\n\nRic e Peppe',
          name: 'Ric e Peppe'
        });
        properties.setProperty(guestKey, new Date().toISOString());
      }
      return reply_({ok:true});
    }
    if (data.type === 'new-request') {
      var noticeKey = 'notified:' + data.id;
      if (properties.getProperty(noticeKey)) return reply_({ok:true,alreadySent:true});
      var notice = 'Nuova richiesta di imbarco su Dory\n\n' +
        'Nome: ' + data.name + '\n' +
        'Uscita e periodo: ' + data.offer + '\n' +
        'Persone: ' + Number(data.people) + '\n' +
        'Email: ' + String(data.email).toLowerCase() + '\n' +
        'Note: ' + (data.message || 'Nessuna') + '\n\n' +
        'La richiesta è in attesa: aprite Gestione equipaggio sul sito Dory per valutarla.';
      MailApp.sendEmail({
        to: 'ricimarino@gmail.com,giuseppeucci8@gmail.com',
        subject: 'Dory · Nuova richiesta di imbarco: ' + data.name,
        body: notice,
        name: 'Ric e Peppe'
      });
      properties.setProperty(noticeKey, new Date().toISOString());
      return reply_({ok:true});
    }
    if (data.type && data.type !== 'confirmation') return reply_({ok:false,error:'invalid-type'});

    var key = 'sent:' + data.id + ':' + String(data.email).toLowerCase();
    if (properties.getProperty(key)) return reply_({ok:true,alreadySent:true});

    var people = Number(data.people);
    var body = 'Ciao ' + data.name + ',\n\n' +
      'com’è dolce navigar in questo mar… soprattutto con un posto su Dory! Il tuo è confermato per ' +
      data.offer + ', per ' + people + ' ' + (people === 1 ? 'persona' : 'persone') + '.\n\n' +
      'Poi, come si dice dalle parti di Napoli, «A mare calmo ogni strunz è marinaio». Quindi niente promesse fatte al meteo: nei tre giorni prima della partenza guardiamo previsioni e condizioni del mare. La decisione se salpare spetta ai Comandanti, Ric e Peppe. Orario, punto d’imbarco e cambi di programma ve li comunichiamo noi.\n\n' +
      'Per salire a bordo servono la tessera sportiva AICS (10 €) e il certificato medico non agonistico. Se vi va, potete lasciare anche un contributo volontario per Dory. Per la parte pratica vi mandiamo tutte le indicazioni prima dell’uscita: niente panico, per ora preparate solo la voglia di mare.\n\n' +
      'A presto a bordo — mare permettendo!\n\nRic e Peppe';
    MailApp.sendEmail({
      to: String(data.email).toLowerCase(),
      subject: 'Dory · Un posto per te a bordo!',
      body: body,
      name: 'Ric e Peppe'
    });
    properties.setProperty(key, new Date().toISOString());
    return reply_({ok:true});
  } catch (err) {
    return reply_({ok:false,error:String(err)});
  } finally {
    lock.releaseLock();
  }
}

function reply_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
