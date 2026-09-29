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
  'apr-first':['Rotta di primavera · prima tratta','14–16 aprile 2027','2027-04-14','2027-04-17',true],
  'apr-second':['Rotta di primavera · seconda tratta','16–18 aprile 2027','2027-04-16','2027-04-19',true],
  'jun-first':['Rotta di giugno · prima tratta','8–11 giugno 2027','2027-06-08','2027-06-12',true],
  'jun-second':['Rotta di giugno · seconda tratta','11–13 giugno 2027','2027-06-11','2027-06-14',true],
  'jul-family':['Con le famiglie verso il Circeo','26 luglio – 1 agosto 2027','2027-07-26','2027-08-02',false],
  'sep-day':['Uscite di fine stagione','20–26 settembre 2027','2027-09-20','2027-09-27',false],
  'sep-weekend':['Ultimo weekend','24–26 settembre 2027','2027-09-24','2027-09-27',true],
  'sep-party':['Festa finale in porto','26 settembre 2027','2027-09-26','2027-09-27',true]
};

function doryCalendarApi_(method, path, body) {
  CalendarApp.getDefaultCalendar();
  var result = UrlFetchApp.fetch('https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(DORY_CALENDAR_) + '/events' + path, {
    method: method, contentType: 'application/json', headers: {Authorization:'Bearer ' + ScriptApp.getOAuthToken()},
    payload: body ? JSON.stringify(body) : undefined, muteHttpExceptions: true
  });
  var code = result.getResponseCode();
  if (code < 200 || code >= 300) throw new Error('Calendar HTTP ' + code + ': ' + result.getContentText());
  return result.getContentText() ? JSON.parse(result.getContentText()) : {};
}
function doryExistingEvents_() {
  var items = [], page = '';
  do {
    var query = '?timeMin=2026-11-22T00%3A00%3A00%2B01%3A00&timeMax=2027-09-28T00%3A00%3A00%2B02%3A00&singleEvents=true&maxResults=2500' + (page ? '&pageToken=' + encodeURIComponent(page) : '');
    var result = doryCalendarApi_('get', query); items = items.concat(result.items || []); page = result.nextPageToken || '';
  } while (page); return items;
}
function doryDescription_(original, block) {
  var start = original.indexOf(DORY_START_), end = original.indexOf(DORY_END_);
  if (start < 0 || end < start) return original.replace(/\s*$/, '') + '\n\n' + block;
  return original.slice(0, start) + block + original.slice(end + DORY_END_.length);
}
function doryBookingEvent_(booking) {
  var offer = DORY_OFFERS_[booking.slot_id];
  var detail = 'Date indicative; orari e logistica saranno confermati da Ric e Peppe.';
  var event = {
    summary:'Dory · ' + offer[0] + ' · ' + booking.name,
    description:DORY_MARKER_ + booking.id + '\n' + offer[0] + ' · ' + offer[1] + '\n' + detail + '\n\n' +
      'Il trick: le giornate didattiche. Servono la tessera sportiva AICS (10 €) e il certificato medico non agonistico.\n' + DORY_SOURCE_,
    start:{date:offer[2]}, end:{date:offer[3]}, guestsCanModify:false, visibility:'private'
  };
  if (booking.email) event.attendees = [{email:String(booking.email).toLowerCase()}];
  return event;
}
function syncDoryCalendar() {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    if (Session.getEffectiveUser().getEmail().toLowerCase() !== 'ricimarino@gmail.com') throw new Error('Esegui con ricimarino@gmail.com');
    var secret = PropertiesService.getScriptProperties().getProperty('DORY_CONFIRMATION_TOKEN');
    if (!secret || secret.length < 32) throw new Error('DORY_CONFIRMATION_TOKEN mancante');
    var response = UrlFetchApp.fetch(DORY_SOURCE_ + '/api/calendar-sync', {headers:{Authorization:'Bearer ' + secret}, muteHttpExceptions:true});
    if (response.getResponseCode() !== 200) throw new Error('Dory HTTP ' + response.getResponseCode());
    var bookings = JSON.parse(response.getContentText()).bookings; if (!Array.isArray(bookings)) throw new Error('Risposta Dory non valida');
    var existing = doryExistingEvents_(), byMarker = {};
    existing.forEach(function(event) { var match = (event.description || '').match(/DORY-BOOKING-ID:([0-9a-f-]{36})/i); if (match) (byMarker[match[1]] = byMarker[match[1]] || []).push(event); });
    DORY_WEEKS_.forEach(function(week) {
      var current = existing.filter(function(event) { return event.id === week.id; })[0]; if (!current) throw new Error('Evento settimanale non trovato: ' + week.id);
      var weekBookings = bookings.filter(function(b) { return week.slots.indexOf(b.slot_id) >= 0; });
      var lines = weekBookings.map(function(b) { var origin = b.added_by === 'ric' ? ' · aggiunto da Ric' : b.added_by === 'peppe' ? ' · aggiunto da Peppe' : ''; return '• ' + b.name + ' — ' + b.people + (Number(b.people) === 1 ? ' persona' : ' persone') + ' · ' + DORY_OFFERS_[b.slot_id][0] + origin; });
      var total = weekBookings.reduce(function(sum, b) { return sum + Number(b.people); }, 0);
      var block = DORY_START_ + '\nPrenotazioni confermate: ' + lines.length + ' · Persone: ' + total + '\n' + (lines.length ? lines.join('\n') : 'Nessuna prenotazione confermata.') + '\n' + DORY_END_;
      var next = doryDescription_(current.description || '', block).replace('https://dory-prenotazioni.riccardo-marin203123.chatgpt.site', DORY_SOURCE_);
      if (next !== (current.description || '')) doryCalendarApi_('patch', '/' + encodeURIComponent(week.id) + '?sendUpdates=none', {description:next});
    });
    var active = {};
    bookings.forEach(function(b) {
      if (!DORY_OFFERS_[b.slot_id] || !DORY_OFFERS_[b.slot_id][4]) return;
      active[b.id] = true;
      var desired = doryBookingEvent_(b), matches = byMarker[b.id] || [], current = matches.shift();
      if (!current) doryCalendarApi_('post', b.email ? '?sendUpdates=all' : '?sendUpdates=none', desired);
      else {
        var currentEmail = (current.attendees || []).map(function(a) { return a.email.toLowerCase(); });
        var desiredEmail = b.email ? [String(b.email).toLowerCase()] : [];
        if (current.summary !== desired.summary || current.description !== desired.description || current.start.date !== desired.start.date || current.end.date !== desired.end.date || currentEmail.join(',') !== desiredEmail.join(','))
          doryCalendarApi_('patch', '/' + encodeURIComponent(current.id) + (b.email ? '?sendUpdates=all' : '?sendUpdates=none'), desired);
      }
      matches.forEach(function(duplicate) { doryCalendarApi_('delete', '/' + encodeURIComponent(duplicate.id) + '?sendUpdates=all'); });
    });
    Object.keys(byMarker).forEach(function(id) { if (!active[id]) byMarker[id].forEach(function(event) { doryCalendarApi_('delete', '/' + encodeURIComponent(event.id) + '?sendUpdates=all'); }); });
  } finally { lock.releaseLock(); }
}
function installDoryCalendarSync() {
  syncDoryCalendar();
  ScriptApp.getProjectTriggers().filter(function(t) { return t.getHandlerFunction() === 'syncDoryCalendar'; }).forEach(ScriptApp.deleteTrigger);
  ScriptApp.newTrigger('syncDoryCalendar').timeBased().everyMinutes(15).create();
}
