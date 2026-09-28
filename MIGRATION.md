# Migrazione Dory a Cloudflare

Stato al 28 settembre 2026: preview su Cloudflare pubblicata e D1 inizializzato, ma migrazione operativa non completata. Il vecchio sito Sites e la sua sincronizzazione oraria restano attivi.

## Proprietà e fonte dei dati

- Repository GitHub `RiciMarino/Dory`: sorgente dell'applicazione.
- Cloudflare Workers: destinazione dell'applicazione, con un D1 **nuovo** chiamato `dory-prenotazioni` e binding `DB`.
- `ricimarino@gmail.com`: proprietario di Apps Script, mittente delle email e proprietario di Calendar. Peppe è invitato con permesso di modifica ai sei eventi settimanali. Gli ospiti ricevono solo eventi individuali relativi alla loro uscita.
- D1 è il registro operativo delle prenotazioni. Il report sotto ciascuna uscita legge quel registro. Un eventuale Foglio Google deve mostrare gli ID delle prenotazioni e chiamare l'azione di cancellazione dell'applicazione; la semplice eliminazione della riga non aggiorna D1, Calendar o le email.

## Preparazione del nuovo ambiente

1. Accedere all'account Cloudflare destinato a Dory e creare un D1 `dory-prenotazioni`. Il suo ID pubblico è nel binding del Worker; il token e l’ID dell’account sono nei segreti GitHub.
2. Eseguire `pnpm build`, poi `node scripts/prepare-cloudflare-config.mjs`. L'ID del D1 creato per Dory è configurato nel codice, come normale binding pubblico; il file generato `dist/server/wrangler.json` resta ignorato da Git.
3. **Completato**: nuovo D1 inizializzato con i quattro file `drizzle/0000_*.sql` … `0003_*.sql`; Worker pubblicato in preview. Il database nuovo è vuoto. Nel vecchio D1 restano 13 prenotazioni di test e una modifica dei posti.
4. Configurare sul Worker i segreti `DORY_RIC_CODE`, `DORY_PEPPE_CODE`, `DORY_SESSION_SECRET`, `DORY_CONFIRMATION_WEBAPP_URL`, `DORY_CONFIRMATION_TOKEN`. Trasferirli tramite gestore segreti, mai tramite commit o log. Mantenere il gateway Apps Script eseguito da `ricimarino@gmail.com`.
5. Esportare dal D1 attuale `requests` e `slots`, includendo ID, stati e indicatori delle email già inviate. Importare nel nuovo D1; verificare numero di righe e ID, poi bloccare temporaneamente nuovi inserimenti durante il passaggio definitivo. Gli inserimenti sono dichiarati di test, ma non vengono eliminati implicitamente.
6. **Preview pubblicata** all'indirizzo `https://dory-prenotazioni.ricimarino.workers.dev/`. Le sei sezioni sono visibili. Restano da verificare accessi di Ric e Peppe, richiesta ospite, report, correzione, cancellazione ed email dopo l'inserimento dei segreti. Non inviare prove a indirizzi di terzi.
7. **Sincronizzazione iniziale attivata il 28 settembre** in Apps Script di `ricimarino@gmail.com`: `installDoryCalendarSync` è terminata senza errori e ha installato il trigger da 15 minuti. La prima settimana è stata verificata su Calendar: descrizione aggiornata, Peppe ancora invitato con modifica. Prima di spegnere la vecchia automazione, verificare anche una prenotazione confermata e la sua cancellazione.
8. Solo dopo la verifica, condividere il nuovo indirizzo e disattivare le scritture sul vecchio sito. Impostare la pubblicazione automatica da GitHub e verificare un commit di prova. Conservare il vecchio ambiente fino al controllo delle prenotazioni dopo il passaggio.

Il workflow `.github/workflows/cloudflare-preview.yml` è inizialmente **manuale** e usa i segreti GitHub `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID`. È stato eseguito con successo per la preview e può essere riutilizzato manualmente. Le credenziali applicative del punto 4 vanno anche inserite nei segreti del Worker; i segreti GitHub servono solo al deployment. Dopo i controlli si può abilitare il trigger su `main`.

## Foglio Google

L'eliminazione fisica di una riga non comunica al trigger quale ID sia stato cancellato. Per renderla affidabile servono una fotografia precedente degli ID e un trigger installabile `onChange`, che confronti gli ID mancanti e chiami un endpoint autenticato di cancellazione; l'endpoint deve poi aggiornare D1, inviti, descrizione e notifiche. È più sicuro iniziare con una colonna **Azione = Cancella** nel Foglio, con ID nascosto/protetto e riscontro dello stato. Il pulsante di cancellazione nel report resta disponibile. Il Foglio non è stato ancora creato né collegato.

## Gestione equipaggio

Gli endpoint che leggono prenotazioni o ne cambiano stato richiedono una sessione firmata dal server. Il login riconosce solo due codici segreti separati, `DORY_RIC_CODE` e `DORY_PEPPE_CODE`, e registra chi aggiunge una persona. Senza questi codici e `DORY_SESSION_SECRET` l'accesso è chiuso. Distribuire i codici solo a Ric e Peppe; i visitatori vedono soltanto il calendario pubblico.

## Giornate da concordare (modifica in preparazione)

La scelta di un giorno singolo riguarda solo `feb-day` (15–21 febbraio 2027) e `sep-day` (20–23 settembre 2027). Ric o Peppe possono indicare il giorno quando aggiungono o modificano una prenotazione. Senza giorno concordato, la persona compare nel riepilogo settimanale ma non riceve un invito individuale per l'intera settimana. Il 26 novembre è già fissato; le altre proposte seguono le date e i criteri esistenti.

Prima del deploy di questa modifica, eseguire **una volta** `drizzle/0004_lethal_lethal_legion.sql` sul D1 nuovo usando l'input `migrate_daily_dates` del workflow, poi pubblicare il Worker. Aggiornare infine il file `CalendarSync.gs` nel progetto Apps Script con la versione di questa repository. Finché il file non è aggiornato, il trigger continua a funzionare con la logica precedente.
