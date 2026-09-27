# Dory ⛵

Un piccolo porto digitale per le giornate didattiche e le tratte con Ric e Peppe. Gli amici vedono le proposte e chiedono un posto senza account; Ric e Peppe confermano l'equipaggio e regolano la capienza dall'area riservata.

## Come funziona

- Le richieste degli ospiti restano in attesa: non occupano posti fino alla conferma.
- Gli amministratori possono aggiungere persone direttamente: il sistema registra automaticamente «Aggiunto da Ric» o «Aggiunto da Peppe».
- Per salire a bordo servono tessera sportiva AICS (10 €) e certificato medico non agonistico. Meteo, rotta e dettagli sono sempre da confermare.

## Tecnologia

Applicazione React/Next.js (Vinext) ospitata su Sites, con database Cloudflare D1. Il codice è qui su GitHub; il sito pubblico e il database continuano a vivere su Sites, perché GitHub Pages da solo non esegue le API delle prenotazioni.

`npm run build` verifica l'applicazione. Le variabili segrete `DORY_RIC_CODE`, `DORY_PEPPE_CODE` e `DORY_SESSION_SECRET` devono essere configurate nell'ambiente di produzione, non nel repository. Non inserire codici personali, dati degli ospiti o copie del database nei commit.

Questo repository è il sorgente del progetto, non un sistema di login né un archivio delle richieste.
