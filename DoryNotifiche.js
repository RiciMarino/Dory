/**
 * Dory notifications compatibility file.
 *
 * Il gateway HTTP è gestito unicamente da Codice.js.
 * Questo file resta intenzionalmente senza doPost(): in Apps Script tutti i file
 * condividono lo stesso namespace globale e due doPost() rendevano ambiguo quale
 * handler venisse eseguito, facendo saltare in particolare manager-confirmation.
 */
