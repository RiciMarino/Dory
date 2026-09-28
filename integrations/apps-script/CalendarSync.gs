/** Run installDoryCalendarSync once as ricimarino@gmail.com after Worker secrets are set. */
var DORY_SOURCE_ = 'https://dory-prenotazioni.ricimarino.workers.dev';
var DORY_CALENDAR_ = 'primary';
var DORY_MARKER_ = 'DORY-BOOKING-ID:';
var DORY_START_ = '— Equipaggio Dory —';
var DORY_END_ = '— Fine equipaggio Dory —';
var DORY_WEEKS_ = [
  {id:'6rgre9e2sut1gf56bt1icrgknk', slots:['nov-day','nov-weekend']},
  {id:'ntc5br507d5f6qdhmqj5i6rt78', slots:['feb-day','feb-night']},
  {id:'fuvohldcrrs3i14bvivs5a4vig', slots:['apr-first','apr-second']},
  {id:'g72nhela9b5o2rt8q8reluuk3k', slots:['jun-first','jun-second']},
  {id:'9tgqe133dqdulojn46nta5fu2k', slots:['jul-family']},
  {id:'4iuuknj76ajid36tb1ck71k3lg', slots:['sep-day','sep-weekend','sep-party']}
];
var DORY_OFFERS_ = {
  'nov-day':['Prima uscita giornaliera','26 novembre 2026','2026-11-26','2026-11-27',true],
  'nov-weekend':['Primo weekend di Dory','27–29 novembre 2026','2026-11-27','2026-11-30',true],
  'feb-day':['Uscita d’inverno','15–21 febbraio 2027','2027-02-15','2027-02-22',false],
  'feb-night':['Una notte fuori','15–21 febbraio 2027','2027-02-15','2027-02-22',false],
  'apr-first':['Rotta di primavera · prima tratta','12–18 aprile 2027','2027-04-12','2027-04-19',false],
  'apr-second':['Rotta di primavera · seconda tratta','12–18 aprile 2027','2027-04-12','2027-04-19',false],
  'jun-first':['Rotta di giugno · prima tratta','7–13 giugno 2027','2027-06-07','2027-06-14',false],
  'jun-second':['Rotta di giugno · seconda tratta','7–13 giugno 2027','2027-06-07','2027-06-14',false],
  'jul-family':['Con le famiglie verso il Circeo','26 luglio – 1 agosto 2027','2027-07-26','2027-08-02',false],
  'sep-day':['Uscite di fine stagione','20–26 settembre 2027','2027-09-20','2027-09-27',false],
  'sep-weekend':['Ultimo weekend','24–26 settembre 2027','2027-09-24','2027-09-27',true],
  'sep-party':['Festa finale in porto','26 settembre 2027','2027-09-26','2027-09-27',true]
};

function doryCalendarApi_(method, path, body) {
  // This call also makes the Calendar authorization scope explicit to Apps Script.
  CalendarApp.getDefaultCalendar();
  var result = UrlFetchApp.fetch('https://www.googleapis.com/calendar/v3/calendars/' +
    encodeURIComponent(DORY_CALENDAR_) + '/events' + path, {
    method: method,
    contentType: 'application/json',
    headers: {Authorization:'Bearer ' + ScriptApp.getOAuthToken()},
    payload: body ? JSON.stringify(body) : undefined,
    muteHttpExceptions: true
  });
  var code = result.getResponseCode();
  if (code < 200 || code >= 300) throw new Error('Calendar HTTP ' + code + ': ' + result.getContentText());
  return result.getContentText() ? JSON.parse(result.getContentText()) : {};
}

function doryExistingEvents_() {
  var items = [], page = '';
  do {
    var query = '?timeMin=2026-11-22T00%3A00%3A00%2B01%3A00&timeMax=2027-09-28T00%3A00%3A00%2B02%3A00&singleEvents=true&maxResults=2500' +
      (page ? '&pageToken=' + encodeURIComponent(page) : '');
    var result = doryCalendarApi_('get', query);
    items = items.concat(result.items || []);
    page = result.nextPageToken || '';
  } while (page);
  return items;
}

function doryDescription_(original, block) {
  var start = original.indexOf(DORY_START_), end = original.indexOf(DORY_END_);
  if (start < 0 || end < start) return original.replace(/\s*$/, '') + '\n\n' + block;
  return original.slice(0, start) + block + original.slice(end + DORY_END_.length);
}

function doryBookingDates_(booking) {
  var offer = DORY_OFFERS_[booking.slot_id];
  if (!offer) return null;
  if ((booking.slot_id === 'feb-day' || booking.slot_id === 'sep-day') && booking.sail_date) {
    var day = String(booking.sail_date);
    var latest = booking.slot_id === 'sep-day' ? '2027-09-23' : '2027-02-21';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day < offer[2] || day > latest) return null;
    var tomorrow = new Date(day + 'T00:00:00Z');
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    return [day, tomorrow.toISOString().slice(0, 10)];
  }
  return offer[4] ? [offer[2], offer[3]] : null;
}

function doryBookingEvent_(booking, dates) {
  var offer = DORY_OFFERS_[booking.slot_id];
  var detail = 'Orari e logistica saranno confermati da Ric e Peppe.';
  var source = JSON.stringify([booking.slot_id, booking.name, booking.email.toLowerCase(), booking.sail_date || '', Number(booking.people)]);
  return {
    summary:'Dory · ' + offer[0] + ' · ' + booking.name,
    description:DORY_MARKER_ + booking.id + '\n' +
      offer[0] + ' · ' + (booking.sail_date || offer[1]) +
      '\n' + detail + '\n\n' +
      'Il trick: le giornate didattiche. Servono la tessera sportiva AICS (10 €) e il certificato medico non agonistico.\n' +
      DORY_SOURCE_ + '\n\n— Note equipaggio —\n',
    start:{date:dates[0]}, end:{date:dates[1]},
    attendees:[{email:booking.email.toLowerCase()},{email:'giuseppeucci8@gmail.com'}],
    guestsCanModify:true, visibility:'private',
    extendedProperties:{private:{dorySource:source}}
  };
}

/** Idempotent reconciliation: weekly descriptions and individual guest invitations. */
function syncDoryCalendar() {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (Session.getEffectiveUser().getEmail().toLowerCase() !== 'ricimarino@gmail.com')
      throw new Error('Esegui con ricimarino@gmail.com');
    var secret = PropertiesService.getScriptProperties().getProperty('DORY_CONFIRMATION_TOKEN');
    if (!secret || secret.length < 32) throw new Error('DORY_CONFIRMATION_TOKEN mancante');
    var response = UrlFetchApp.fetch(DORY_SOURCE_ + '/api/calendar-sync', {
      headers:{Authorization:'Bearer ' + secret}, muteHttpExceptions:true
    });
    if (response.getResponseCode() !== 200) throw new Error('Dory HTTP ' + response.getResponseCode());
    var bookings = JSON.parse(response.getContentText()).bookings;
    if (!Array.isArray(bookings)) throw new Error('Risposta Dory non valida');
    var existing = doryExistingEvents_();
    var byMarker = {};
    existing.forEach(function(event) {
      var match = (event.description || '').match(/DORY-BOOKING-ID:([0-9a-f-]{36})/i);
      if (match) (byMarker[match[1]] = byMarker[match[1]] || []).push(event);
    });
    DORY_WEEKS_.forEach(function(week) {
      var current = existing.filter(function(event) { return event.id === week.id; })[0];
      if (!current) throw new Error('Evento settimanale non trovato: ' + week.id);
      var lines = bookings.filter(function(b) { return week.slots.indexOf(b.slot_id) >= 0; }).map(function(b) {
        var origin = b.added_by === 'ric' ? ' · aggiunto da Ric' : b.added_by === 'peppe' ? ' · aggiunto da Peppe' : '';
        return '• ' + b.name + ' — ' + b.people + (Number(b.people) === 1 ? ' persona' : ' persone') +
          ' · ' + DORY_OFFERS_[b.slot_id][0] + origin;
      });
      var total = bookings.filter(function(b) { return week.slots.indexOf(b.slot_id) >= 0; })
        .reduce(function(sum, b) { return sum + Number(b.people); }, 0);
      var block = DORY_START_ + '\nPrenotazioni confermate: ' + lines.length +
        ' · Persone: ' + total + '\n' + (lines.length ? lines.join('\n') : 'Nessuna prenotazione confermata.') +
        '\n' + DORY_END_;
      var next = doryDescription_(current.description || '', block)
        .replace('https://dory-prenotazioni.riccardo-marin203123.chatgpt.site', DORY_SOURCE_);
      if (next !== (current.description || ''))
        doryCalendarApi_('patch', '/' + encodeURIComponent(week.id) + '?sendUpdates=none', {description:next});
    });
    var active = {};
    bookings.forEach(function(b) {
      // An undated flexible week stays in the weekly description, without a guest invitation.
      var dates = doryBookingDates_(b);
      if (!dates || !b.email) return;
      active[b.id] = true;
      var desired = doryBookingEvent_(b, dates);
      var matches = byMarker[b.id] || [];
      var current = matches.shift();
      if (!current) {
        doryCalendarApi_('post', '?sendUpdates=all', desired);
      } else {
        var currentEmail = (current.attendees || []).map(function(a) { return a.email.toLowerCase(); }).sort();
        var desiredEmail = desired.attendees.map(function(a) { return a.email; }).sort();
        var sourceChanged = !current.extendedProperties || !current.extendedProperties.private ||
          current.extendedProperties.private.dorySource !== desired.extendedProperties.private.dorySource;
        if (sourceChanged) {
          // Keep crew notes added after the generated description when booking details change.
          var separator = '\n\n— Note equipaggio —\n';
          var existingNotes = (current.description || '').split(separator);
          if (existingNotes.length > 1) desired.description += existingNotes.slice(1).join(separator);
          doryCalendarApi_('patch', '/' + encodeURIComponent(current.id) + '?sendUpdates=all', desired);
        } else if (current.guestsCanModify !== true || currentEmail.join(',') !== desiredEmail.join(',')) {
          doryCalendarApi_('patch', '/' + encodeURIComponent(current.id) + '?sendUpdates=all',
            {attendees:desired.attendees, guestsCanModify:true});
        }
      }
      matches.forEach(function(duplicate) {
        doryCalendarApi_('delete', '/' + encodeURIComponent(duplicate.id) + '?sendUpdates=all');
      });
    });
    Object.keys(byMarker).forEach(function(id) {
      if (!active[id]) byMarker[id].forEach(function(event) {
        doryCalendarApi_('delete', '/' + encodeURIComponent(event.id) + '?sendUpdates=all');
      });
    });
  } finally {
    lock.releaseLock();
  }
}

function installDoryCalendarSync() {
  // Test the source and Calendar access before installing the recurring trigger.
  syncDoryCalendar();
  ScriptApp.getProjectTriggers().filter(function(t) {
    return t.getHandlerFunction() === 'syncDoryCalendar';
  }).forEach(ScriptApp.deleteTrigger);
  ScriptApp.newTrigger('syncDoryCalendar').timeBased().everyMinutes(15).create();
}
