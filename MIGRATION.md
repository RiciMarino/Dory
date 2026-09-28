# Migrazione Dory a Cloudflare

Stato: preparazione. Il sito pubblico e il suo D1 su Sites restano attivi fino alla verifica del nuovo indirizzo. Questo documento non implica che il passaggio sia avvenuto.

## Proprietà e fonte dei dati

- Repository GitHub `RiciMarino/Dory`: sorgente dell'applicazione.
- Cloudflare Workers: destinazione dell'applicazione, con un D1 **nuovo** chiamato `dory-prenotazioni` e binding `DB`.
- `ricimarino@gmail.com`: proprietario di Apps Script, mittente delle email e proprietario di Calendar. Peppe è invitato con permesso di modifica ai sei eventi settimanali. Gli ospiti ricevono solo eventi individuali relativi alla loro uscita.
- D1 è il registro operativo delle prenotazioni. Il report sotto ciascuna uscita legge quel registro. Un eventuale Foglio Google deve mostrare gli ID delle prenotazioni e chiamare l'azione di cancellazione dell'applicazione; la semplice eliminazione della riga non aggiorna D1, Calendar o le email.

## Preparazione del nuovo ambiente

1. Accedere all'account Cloudflare destinato a Dory e collegare il repository GitHub. Creare un D1 `dory-prenotazioni`, conservando il suo ID fuori dal repository.
2. Eseguire `pnpm build`, poi `DORY_D1_DATABASE_ID=<ID> node scripts/prepare-cloudflare-config.mjs`. Il file generato `dist/server/wrangler.json` resta ignorato da Git.
3. Applicare sul nuovo D1, **una sola volta e nell'ordine**, i quattro file `drizzle/0000_*.sql` … `0003_*.sql`. Le righe `--> statement-breakpoint` sono commenti SQL. Verificare tabelle `requests` e `slots` e le colonne di tracciamento email.
4. Configurare sul Worker i segreti `DORY_RIC_CODE`, `DORY_PEPPE_CODE`, `DORY_SESSION_SECRET`, `DORY_CONFIRMATION_WEBAPP_URL`, `DORY_CONFIRMATION_TOKEN`. Trasferirli tramite gestore segreti, mai tramite commit o log. Mantenere il gateway Apps Script eseguito da `ricimarino@gmail.com`.
5. Esportare dal D1 attuale `requests` e `slots`, includendo ID, stati e indicatori delle email già inviate. Importare nel nuovo D1; verificare numero di righe e ID, poi bloccare temporaneamente nuovi inserimenti durante il passaggio definitivo. Gli inserimenti sono dichiarati di test, ma non vengono eliminati implicitamente.
6. Pubblicare su un indirizzo `workers.dev` di prova. Verificare accessi di Ric e Peppe, richiesta ospite, report sotto la singola uscita, correzione e cancellazione, una sola email per azione e rimozione dell'invito individuale. Non inviare prove a indirizzi di terzi.
7. Portare la sincronizzazione di Calendar nella componente Google di `ricimarino@gmail.com`, mantenendo i sei eventi settimanali e le descrizioni con nome, periodo e note senza email. Verificare che l'invito dell'ospite abbia la sola durata della sua prenotazione; per date non ancora fissate, attendere la scelta del giorno.
8. Solo dopo la verifica, condividere il nuovo indirizzo e disattivare le scritture sul vecchio sito. Impostare la pubblicazione automatica da GitHub e verificare un commit di prova. Conservare il vecchio ambiente fino al controllo delle prenotazioni dopo il passaggio.

## Foglio Google

L'eliminazione fisica di una riga non comunica al trigger quale ID sia stato cancellato. Per renderla affidabile servono una fotografia precedente degli ID e un trigger installabile `onChange`, che confronti gli ID mancanti e chiami un endpoint autenticato di cancellazione; l'endpoint deve poi aggiornare D1, inviti, descrizione e notifiche. È più sicuro iniziare con una colonna **Azione = Cancella** nel Foglio, con ID nascosto/protetto e riscontro dello stato. Il pulsante di cancellazione nel report resta disponibile. Il Foglio non è stato ancora creato né collegato.
