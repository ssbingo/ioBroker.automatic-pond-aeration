![Logo](../../admin/automatic-pond-aeration.png)
# ioBroker.automatic-pond-aeration

<p align="center">
  <a href="https://www.buymeacoffee.com/ssbingo"><img src="https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=&slug=ssbingo&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" /></a>
</p>

## Adattatore automatic-pond-aeration per ioBroker

Questo adattatore **controlla e monitora un impianto di aerazione per laghetti**. Una pompa d'aria/un
compressore invia aria attraverso valvole (elettrovalvole) fino a **massimo 8 punti di aerazione** nel
laghetto. L'adattatore commuta queste valvole secondo un **programma orario**, un **ciclo a rotazione
(round-robin)** o un **programma a gruppi** e protegge la pompa con un **blocco di sicurezza
(interlock)**: finché la pompa è in funzione, resta sempre aperta almeno una valvola – altrimenti
viene aperta la **valvola di emergenza** e (se la pompa è disponibile come punto dati) la pompa viene
spenta.

Facoltativamente può monitorare l'**ossigeno disciolto**, la **temperatura dell'aria e dell'acqua** e
la **pressione**, calcolare gli **orari astronomici** dalla tua **geolocalizzazione**, pilotare
l'hardware **direttamente su un ESP32** (senza un'ulteriore istanza ioBroker) e mettere in pausa
determinati punti di aerazione durante l'alimentazione quando è installato
[ioBroker.automatic-feeder](https://github.com/ssbingo/ioBroker.automatic-feeder).

> 🛑 **AVVERTENZA — STATO DI SVILUPPO, BENESSERE DEGLI ANIMALI (da leggere).**
> Questo adattatore è **ancora in fase di sviluppo attivo e NON è ancora verificato per l'uso non
> presidiato.** Controlla un **sistema di supporto vitale per animali vivi**: un malfunzionamento,
> una configurazione errata o un bug possono arrestare l'aerazione e **mettere in pericolo la salute
> e la vita dei tuoi pesci e delle altre forme di vita del laghetto** (carenza di ossigeno, assenza
> di un foro libero dal ghiaccio in inverno, una pompa che lavora contro valvole chiuse). **Non
> usarlo senza controllo:** prima di qualsiasi funzionamento non presidiato, **osservalo attentamente
> e verifica ogni funzione** sul tuo hardware per un periodo significativo, e mantieni in funzione
> un'aerazione/sicurezza indipendente e collaudata. **Usalo a tuo rischio.** *(Questa avvertenza
> rimane valida fino a esplicita revoca.)*

> ⚠️ **Stato del progetto.** Completamente implementato e configurabile dall'admin: il controllo delle
> valvole (programma orario, ciclo a rotazione round-robin, gruppi), il **blocco di sicurezza** contro
> il dead-heading, il **monitoraggio** (ossigeno, temperatura aria/acqua, pressione con allarmi), gli
> **orari astronomici & la geolocalizzazione**, l'**accoppiamento con il feeder**, la **modalità
> inverno / anti-ghiaccio**, il **circuito chiuso dell'ossigeno**, le **notifiche** tramite un
> adattatore di messaging, le **statistiche di funzionamento**, una **modalità di test dry-run**, i
> **pulsanti di override** per punto e il backend hardware **ESP32** diretto (comunica via HTTP con il
> firmware di riferimento — flashalo nel browser dalla
> [pagina di flash del firmware](https://ssbingo.github.io/pond-aeration-flash/)). Il backend
> predefinito pilota le tue valvole e la pompa tramite stati ioBroker esistenti, così funziona
> qualsiasi scheda a relè.

> 📘 **Manuale completo passo passo (PDF, per principianti — con schemi di cablaggio, FAQ e
> risoluzione dei problemi):** English → [../../docs/manual/pond-aeration-manual.en.pdf](../../docs/manual/pond-aeration-manual.en.pdf) ·
> Deutsch → [../../docs/manual/pond-aeration-manual.de.pdf](../../docs/manual/pond-aeration-manual.de.pdf)
> (sorgente e build in [../../docs/manual/](../../docs/manual/)).

---

## Indice

1. [Cosa fa l'adattatore](#1-cosa-fa-ladattatore)
2. [Concetto di sicurezza](#2-concetto-di-sicurezza)
3. [Requisiti](#3-requisiti)
4. [Installazione](#4-installazione)
5. [Configurazione](#5-configurazione)
6. [Oggetti / punti dati](#6-oggetti--punti-dati)
7. [Roadmap](#7-roadmap)

---

## 1. Cosa fa l'adattatore

Un'aerazione per laghetti distribuisce l'aria da un'unica pompa a più diffusori/pietre porose. Quali
punti ricevono aria è deciso dalle **elettrovalvole**. Questo adattatore decide **quando** ciascuna
valvola si apre:

* **Programma orario** – aprire un punto/gruppo durante le fasce orarie configurate per giorno della
  settimana.
* **Ciclo a rotazione (round-robin)** – scorrere i punti a turno, ciascuno aperto per un tempo di
  permanenza configurabile.
* **Gruppi** – controllare più punti insieme; non ci possono **mai essere più gruppi che punti**.

Le valvole e la pompa vengono pilotate **o** tramite **stati ioBroker esistenti** (da qualsiasi
adattatore che esponga gli interruttori) **oppure direttamente su un controller ESP32 dedicato** su
cui gira il firmware di riferimento — senza un'ulteriore istanza ioBroker. Scegli questa opzione in
**Backend hardware** (scheda Generale); vedi [Configurazione → Generale](#generale).

## 2. Concetto di sicurezza

Un compressore d'aria non deve **mai funzionare contro valvole completamente chiuse** (dead-heading) –
ciò provoca sovrapressione e può danneggiare la pompa. Pertanto:

* Finché la pompa è in funzione, **resta sempre aperta almeno una valvola** (minimo configurabile).
* Se questo non può essere garantito, viene **aperta la valvola di emergenza** e, se la pompa è
  controllabile, la **pompa viene spenta**.
* La commutazione delle valvole avviene secondo il principio **make-before-break** (la valvola
  successiva si apre prima che quella precedente si chiuda), così non esiste mai un istante con tutte
  le valvole chiuse.

> 💡 **Consiglio di cablaggio:** utilizzare una valvola di emergenza **normalmente aperta (NO)**, in
> modo che si apra in caso di mancanza di corrente (fail-safe). Quando l'hardware funziona su un
> ESP32, lo stesso interlock viene eseguito anche localmente sul dispositivo, così un'interruzione di
> rete o di ioBroker non può danneggiare la pompa.

## 3. Requisiti

* Node.js ≥ 22
* js-controller ≥ 6.0.11, admin ≥ 7.6.20
* Una o più valvole raggiungibili come stati ioBroker (ad es. un adattatore relè/presa smart).

## 4. Installazione

Installa l'adattatore dall'admin di ioBroker (oppure, in fase di sviluppo, dal repository GitHub) e
crea un'istanza. Apri le impostazioni dell'istanza per configurarlo.

## 5. Configurazione

La pagina delle impostazioni è organizzata in schede. Non devi compilare tutto: solo le parti che
usi.

### Generale
- **Abilitazione principale** – l'interruttore on/off dell'intero adattatore. Quando è spento, non
  viene controllato nulla.
- **Dry-run (solo log, non commutare l'hardware)** – l'intero motore di controllo funziona e i punti
  dati si aggiornano, ma i comandi delle valvole/della pompa vengono solo scritti nel log
  (`[DRY-RUN] would …`) invece che negli stati reali. Ideale per la messa in servizio e per testare
  una configurazione prima di cablarla.
- **Backend hardware** – `Stati ioBroker esistenti` (predefinito) pilota le tue valvole/la tua pompa
  tramite gli stati di altri adattatori. `ESP32 (diretto)` comunica via HTTP con il firmware di
  riferimento su un Waveshare ESP32-S3-POE-ETH-8DI-8RO. Flasha il firmware nel browser dalla
  [pagina di flash del firmware](https://ssbingo.github.io/pond-aeration-flash/) (Chrome/Edge, senza
  software aggiuntivo), poi imposta l'**host/IP** e associa il **relè della valvola di emergenza** e
  il **relè della pompa** (0–7); i punti di aerazione usano il canale relè impostato per ciascun punto.
  L'adattatore invia una configurazione di sicurezza e un heartbeat affinché il failsafe integrato nel
  dispositivo del firmware protegga il laghetto anche se ioBroker è offline.
  - **Pianificazione autonoma (funziona senza ioBroker)** *(solo ESP32, facoltativo)* – se
    abilitata, l'adattatore invia anche le tue pianificazioni al dispositivo; se la connessione
    cade, l'ESP32 continua a eseguirle da solo usando il suo orologio NTP (l'interblocco di
    sicurezza dead-head resta valido). La sequenza ciclica resta gestita dall'adattatore.
  - **Compatibilità del firmware** – l'adattatore e il firmware vengono abbinati tramite una
    **versione del protocollo** (il contratto vincolante), non in base ai numeri di release esatti.
    Questa versione dell'adattatore parla il **protocollo 1** e **consiglia il firmware v1.6.0**
    (minimo v1.0.0); l'admin lo mostra e rimanda alle release. Alla connessione, la versione del
    dispositivo e un flag di compatibilità vengono pubblicati come `info.deviceFirmware` e
    `info.firmwareCompatible`, e qualsiasi discrepanza di protocollo viene scritta nel log. Vedi la
    tabella di compatibilità nel [manuale](../../docs/manual/pond-aeration-manual.en.pdf) / repo del
    firmware.
  - **Licenza** *(solo se il tuo firmware include l'overlay di licenza opzionale)* – il dispositivo
    opera su un livello: **free** (solo monitoraggio), **community** (controllo dei relè) o **pro**
    (+ la pianificazione autonoma indipendente); la sicurezza (failsafe, valvola di emergenza,
    interblocco dead-head, pulsanti manuali) è sempre attiva a prescindere. Un nuovo dispositivo
    funziona pienamente (**pro**) per un periodo di prova, poi ripiega su free finché non viene
    inserita una chiave di attivazione nella pagina `/license` del dispositivo. L'adattatore mostra
    lo stato sotto `info.licenseTier` / `info.licenseTrialDaysLeft` / `info.deviceCode`; se il
    dispositivo **non dispone di licenza per il controllo**, il monitoraggio continua a funzionare e
    il controllo viene saltato (vedi `info.licenseControlBlocked`). Il firmware pubblico senza
    l'overlay non è interessato.
    *Nota sul re-flashing:* la chiave di attivazione è memorizzata sull'ESP e viene **cancellata
    quando esegui nuovamente il flash tramite l'installer del browser** (inizia un nuovo periodo di
    prova). Il **codice del dispositivo deriva dall'hardware e non cambia mai**, quindi è sufficiente
    **reinserire la stessa chiave di attivazione** — non serve una nuova chiave. Un **aggiornamento
    del firmware tramite la pagina Update del dispositivo** (aggiornamento online con un clic o
    caricamento di un file) mantiene l'attivazione e tutte le impostazioni; solo l'installer la
    azzera.
  - **Mirroring dei sensori** – a ogni interrogazione l'adattatore invia anche i tuoi punti dati dei
    sensori configurati (ossigeno, temperatura acqua/aria, pressione) al dispositivo, così compaiono
    sulla **web UI dell'ESP** (contrassegnati con *(ioBroker)*) anche per i sensori che sono solo
    stati ioBroker e non cablati all'ESP. Un sensore ESP fisicamente cablato mantiene la priorità; i
    valori inviati scadono dopo alcuni minuti. Richiede firmware ≥ 1.1.7.
- **Intervallo di polling (s)** – ogni quanto viene interrogato lo stato del backend (ad es. `30`).

### Punti di aerazione
Il cuore della configurazione. Aggiungi **fino a 8** punti; ciascun punto è una valvola. Per ogni
punto:
- **Nome** – ad es. `Pier`, `Deep zone`. Con il backend **ESP32** questo nome viene **mostrato anche
  sulla web UI del dispositivo** (sul canale relè del punto) — una **funzione su licenza** (a partire
  dal livello **community**). `Ch 7 = Notventil` (valvola di emergenza) e `Ch 8 = Pumpe` (pompa) sono
  etichette fisse. Vedi [Nomi sulla web UI dell'ESP32](#nomi-sulla-web-ui-dellesp32).
- **Abilitato** – includere questo punto nel controllo.
- **Backend** – `ioBroker` (uno stato esterno) o `ESP32` (un canale relè sul dispositivo). L'opzione
  `ESP32` compare solo quando il **Backend hardware** (scheda Generale) è `ESP32 (diretto)`.
- **Stato valvola / canale** – per il backend ioBroker, scegli lo stato interruttore che apre la
  valvola (tramite il browser degli oggetti). Per il backend ESP32, scegli il **canale relè** da un
  menu a tendina: i canali che pilotano la **pompa** e la **valvola di emergenza** sono mostrati come
  *riservati* e i canali già occupati da un altro punto come *in uso*, così puoi selezionare solo un
  canale libero. Quando non resta alcun canale, aggiungi altri punti come **stati ioBroker** tramite
  la colonna Backend.
- **Pulsante di override** *(opzionale)* – un pulsante fisico per punto (ad es. un ingresso digitale
  di un ESP32, o un qualsiasi stato booleano). Funziona come un **interruttore a commutazione
  (toggle)**: una pressione forza il punto **acceso con priorità sul controllo automatico**
  (programma/sequenza/inverno/ossigeno) e persino su una pausa del feeder — *solo l'interruttore
  principale o un intervento di sicurezza lo annullano*. Premi di nuovo per rilasciarlo. (Sono
  previste altre modalità del pulsante; il campo è predisposto per esse.) Un pulsante è disponibile
  solo per una **valvola di aerazione** — un punto che si trova sul canale relè ESP32 della **pompa**
  o della **valvola di emergenza** non può averne uno (l'opzione è disattivata). Con il backend ESP32,
  un pulsante premuto **sul dispositivo** viene riflesso in ioBroker (`aeration.point.<n>.buttonOn`) e
  ottiene la stessa priorità.
- **Nome del pulsante** *(backend ESP32, opzionale)* – un nome amichevole per il pulsante di override
  di questo punto, mostrato sulla web UI del dispositivo (vedi sotto). Vuoto → il pulsante mostra il
  nome del punto.

#### Nomi sulla web UI dell'ESP32

*(Backend ESP32, **funzione su licenza** — disponibile a partire dal livello **community**.)* Assegna
ai tuoi canali e ai tuoi pulsanti nomi amichevoli che compaiono sulle pagine web del dispositivo al
posto di `Ch 1…8` / `DI 1…8`:

- L'adattatore **invia il Nome di ciascun punto di aerazione** al relativo canale relè (Ch 1–6) e il
  **Nome del pulsante** facoltativo di ciascun punto all'ingresso digitale corrispondente (DI 1–8).
- `Ch 7 = Notventil` (valvola di emergenza) e `Ch 8 = Pumpe` (pompa) sono **fissi** e non possono
  essere rinominati.
- **Autonomo (senza adattatore):** gli stessi nomi possono essere modificati **sul dispositivo** in
  *Impostazioni → Namen (Kanäle & Taster)* e sono memorizzati sull'ESP (NVS); quando l'adattatore è
  connesso li sovrascrive con i nomi qui configurati.
- Su un firmware **free** (senza licenza) i nomi vengono ignorati e le pagine mostrano le etichette
  predefinite `Ch`/`DI`.

### Gruppi
Raggruppa i punti per commutarli insieme (ad es. un pulsante apre più diffusori). Assegna un nome al
gruppo e spunta i punti che ne fanno parte. **Non ci possono mai essere più gruppi che punti.**

### Controllo
- **Ciclo a rotazione (round-robin)** – scorrere i punti a turno, ciascuno aperto per il **tempo di
  permanenza** (secondi).
  - **Sequenza (punti e gruppi)** – definisci facoltativamente un **ciclo ordinato di passi**, dove
    ogni passo mira a un singolo **punto o a un intero gruppo** e può avere il proprio tempo di
    permanenza. Ciò consente di eseguire ad es. *gruppo 1 → gruppo 3 → punto 1 → …* e di **mescolare**
    liberamente punti e gruppi. Riordina i passi con le frecce su/giù nell'admin. Lascia vuota la
    sequenza per tornare al semplice round-robin su tutti i punti.
- **Programmi orari** – aprire punti/gruppi selezionati durante una fascia oraria per giorno della
  settimana. **Da**/**A** si scelgono con un **selettore d'orologio** (ora/minuto, 24 h; sono
  supportate fasce che attraversano la notte come `22:00`–`06:00`). Un programma attivo ha **priorità
  sul round-robin / sulla sequenza**.
- **Modalità inverno / anti-ghiaccio** – durante la stagione configurata (**Inizio**/**Fine** scelti
  con un **calendario** — contano solo **giorno e mese**, ricorrenti ogni anno, ad es. 1 nov – 15 mar,
  con passaggio oltre il nuovo anno) i punti selezionati
  vengono forzati in accensione per mantenere aperto un foro libero dal ghiaccio. Facoltativamente
  spunta **Solo quando fa freddo (protezione antigelo)** e imposta una **soglia di temperatura
  dell'aria**, così il laghetto viene aerato solo quando sta effettivamente gelando (ciò richiede il
  monitoraggio della temperatura dell'aria). Lascia vuoto **Punti mantenuti aperti** per aerare tutto
  il laghetto. La modalità inverno funziona nella modalità operativa `auto` e, come ogni programma,
  cede comunque il passo al blocco di sicurezza e a una pausa del feeder.

### Sensori
Monitoraggio facoltativo. Per ogni sensore spunta **Abilitato** e scegli lo **stato sorgente**:
- **Ossigeno disciolto** – con una soglia minima (attiva `sensors.oxygenAlarm`), un valore obiettivo
  e un'isteresi; la **% di saturazione** di ossigeno viene calcolata dalla temperatura dell'acqua.
  - **Circuito chiuso dell'ossigeno** – quando è abilitato, l'adattatore **forza l'aerazione in
    accensione** finché l'ossigeno è sotto la soglia minima e la mantiene attiva finché non risale al
    valore obiettivo (o a `low + hysteresis` quando non è impostato alcun obiettivo). Lascia vuoto
    **Punti potenziati** per potenziare tutto il laghetto. Come la modalità inverno, il circuito
    funziona nella modalità `auto` e cede il passo al blocco di sicurezza e alle pause del feeder.
- **Temperatura aria/acqua**.
- **Pressione** – con min/max (fuori intervallo attiva `sensors.pressureAlarm`).

### Posizione
Necessaria per gli orari astronomici (alba/tramonto/notte).
- **Sorgente della posizione** – `Posizione di sistema ioBroker` (usa le coordinate del tuo sistema) o
  `Posizione personalizzata`. Per una posizione personalizzata, digita un indirizzo e premi **Cerca**
  (geocodificato su richiesta tramite OpenStreetMap/Nominatim) oppure clicca/trascina il marcatore
  sulla mappa.

### Feeder
Mettere in pausa i punti selezionati mentre
[ioBroker.automatic-feeder](https://github.com/ssbingo/ioBroker.automatic-feeder) sta alimentando,
così il cibo non viene disperso.
- Scegli l'**istanza feeder** (rilevata automaticamente) e spunta gli **interruttori feeder** da
  monitorare.
- **Modalità durata** – `Misura` sorveglia l'interruttore (pausa = alimentazione + offset, senza
  conoscere in anticipo la durata dell'alimentazione); `Impulso` usa una durata di alimentazione
  fissa.
- **Offset (s)** – pausa aggiuntiva dopo la fine dell'alimentazione. **Dovrebbe essere almeno pari al
  tempo medio che gli animali impiegano per mangiare** (esempio: 15 s di alimentazione + 60 s di
  offset ⇒ 75 s di aerazione in pausa).
- **Punti interessati** – quali punti vanno in pausa durante l'alimentazione.

### Sicurezza
Ogni campo di questa scheda riporta una **spiegazione nell'admin** di ciò che fa e del suo effetto —
leggile, perché questa è la scheda in cui un valore sbagliato conta di più.
- **Valvole aperte min. mentre la pompa è in funzione** – la protezione contro il dead-heading
  (predefinito `1`).
- **Intervallo del watchdog (s)** e **sovrapposizione make-before-break (s)**.
- **Pompa** – se è **controllabile**, il **segnale** della pompa e i tempi minimi di
  accensione/spegnimento contro i cicli troppo brevi. Quando è controllabile, l'adattatore **pilota la
  pompa affinché segua la richiesta di aerazione** — è in funzione finché è aperto almeno il minimo di
  valvole e si spegne quando il laghetto è a riposo o in caso di intervento contro il dead-heading
  (rispettando i tempi minimi di accensione/spegnimento); quando *non* è controllabile la pompa viene
  solo osservata e la valvola di emergenza la protegge da sola. *Con il backend **ESP32** il segnale
  della pompa è il **canale relè ESP32** — esattamente lo stesso impostato in Generale → Backend
  hardware, qui mostrato affinché le due schede non possano mai contraddirsi; con il backend
  **ioBroker** è uno stato ioBroker.*
- **Valvola di emergenza** – il suo **segnale**, se è **normalmente aperta** (fail-safe), il **tipo**
  di valvola (elettrovalvola o valvola a sfera motorizzata) e, per una valvola motorizzata, il suo
  **tempo di corsa**. *Con il backend ESP32 il segnale è analogamente il canale relè ESP32 della
  valvola di emergenza (come in Generale).*

### Notifiche
Abilita le notifiche e scegli un'**istanza di messaging** (un qualsiasi adattatore di tipo
`messaging`, ad es. Telegram o Pushover), poi **spunta quali eventi** devono inviare un messaggio:
- **Blocco di sicurezza** – quando il blocco contro il dead-heading interviene o si disattiva;
- **Allarme ossigeno** – quando l'ossigeno disciolto scende troppo o si riprende;
- **Allarme pressione** – quando la pressione esce dal suo intervallo o vi rientra.

A ogni fronte (intervento e rientro) viene inviato un breve testo localizzato. Se non è spuntato alcun
evento, non viene inviato nulla.

## 6. Oggetti / punti dati

L'adattatore crea i suoi punti dati a partire dalla tua configurazione. Segnaposto: `<n>` = indice
del punto di aerazione (0–7), `<g>` = indice del gruppo. Gli oggetti contrassegnati con **(w)** sono
comandi scrivibili; tutti gli altri sono valori di stato in sola lettura aggiornati dall'adattatore.

**Generale**

| Oggetto | Tipo | Ruolo | Descrizione |
|---------|------|-------|-------------|
| `info.connection` | boolean | `indicator.connected` | Adattatore in funzione / configurazione valida |
| `info.backend` | string | `text` | Backend hardware attivo (`iobroker` o `esp32`) |
| `info.activeMode` | string | `text` | Modalità operativa corrente |
| `info.dryRun` | boolean | `indicator` | Dry-run attivo (nessun hardware viene commutato) |

**Backend ESP32 (info)** (solo con il backend hardware ESP32)

| Oggetto | Tipo | Ruolo | Descrizione |
|---------|------|-------|-------------|
| `info.deviceFirmware` | string | `text` | Versione del firmware riportata dall'ESP32 |
| `info.firmwareCompatible` | boolean | `indicator` | Il protocollo del firmware è compatibile con questo adattatore |
| `info.licenseTier` | string | `text` | Livello di licenza attivo: `free` (monitoraggio), `community` (controllo dei relè) o `pro` (+ pianificazione autonoma); vuoto se il firmware non è soggetto a licenza |
| `info.licenseTrialDaysLeft` | number | `value` | Giorni di prova della licenza rimanenti (0 = nessuna prova in corso) |
| `info.deviceCode` | string | `text` | Codice del dispositivo — comunicalo per lo sblocco per ricevere una chiave di attivazione |
| `info.licenseControlBlocked` | boolean | `indicator` | Il dispositivo ha rifiutato un comando di controllo (non dotato di licenza per il controllo) |

**Controllo (comandi scrivibili)**

| Oggetto | Tipo | Ruolo | Descrizione |
|---------|------|-------|-------------|
| `control.enabled` | boolean (w) | `switch.enable` | Abilitazione principale |
| `control.mode` | string (w) | `text` | Modalità operativa: `auto`, `manual` o `off` |
| `control.allOff` | boolean (w) | `button` | Chiudere tutte le valvole |
| `control.point.<n>.open` | boolean (w) | `switch` | Aprire manualmente la valvola del punto `<n>` |
| `control.group.<g>.active` | boolean (w) | `switch` | Attivare manualmente il gruppo `<g>` |

**Punti di aerazione** (un canale per ogni punto configurato, denominato in base al punto)

| Oggetto | Tipo | Ruolo | Descrizione |
|---------|------|-------|-------------|
| `aeration.point.<n>.valveState` | boolean | `indicator` | La valvola è aperta |
| `aeration.point.<n>.active` | boolean | `indicator` | Il punto sta aerando |
| `aeration.point.<n>.buttonOn` | boolean | `indicator` | Pulsante di override manuale attivo (solo con un pulsante configurato) |
| `aeration.point.<n>.runtimeTodaySec` | number | `value` | Tempo di funzionamento odierno (secondi) |
| `aeration.point.<n>.runtimeTotalH` | number | `value` | Tempo di funzionamento totale (ore, per la manutenzione) |
| `aeration.point.<n>.lastChange` | number | `value.time` | Marca temporale dell'ultimo cambio valvola |
| `aeration.point.<n>.error` | string | `text` | Ultimo errore per questo punto |

**Gruppi**

| Oggetto | Tipo | Ruolo | Descrizione |
|---------|------|-------|-------------|
| `groups.<g>.members` | string | `json` | Indici dei punti membri |
| `groups.<g>.active` | boolean | `indicator` | Il gruppo è attualmente attivo |

**Sicurezza**

| Oggetto | Tipo | Ruolo | Descrizione |
|---------|------|-------|-------------|
| `safety.interlockActive` | boolean | `indicator.alarm` | Blocco di sicurezza attualmente attivo |
| `safety.emergencyValve` | boolean | `indicator` | La valvola di emergenza è aperta |
| `safety.pumpRunning` | boolean | `indicator` | La pompa è in funzione |
| `safety.openValveCount` | number | `value` | Numero di valvole aperte |
| `safety.lastTripReason` | string | `text` | Motivo dell'ultimo intervento del blocco |

**Sensori** (creati solo quando il relativo monitoraggio è abilitato)

| Oggetto | Tipo | Ruolo | Descrizione |
|---------|------|-------|-------------|
| `sensors.oxygen` | number | `value` | Ossigeno disciolto (mg/l) |
| `sensors.oxygenSaturation` | number | `value` | Saturazione di ossigeno (%) |
| `sensors.oxygenAlarm` | boolean | `indicator.alarm` | Ossigeno sotto la soglia minima |
| `sensors.oxygenBoostActive` | boolean | `indicator` | Il circuito chiuso dell'ossigeno sta forzando l'aerazione in accensione (solo con il circuito abilitato) |
| `sensors.airTemperature` | number | `value.temperature` | Temperatura dell'aria (°C) |
| `sensors.waterTemperature` | number | `value.temperature` | Temperatura dell'acqua (°C) |
| `sensors.pressure` | number | `value.pressure` | Pressione del sistema (bar) |
| `sensors.pressureAlarm` | boolean | `indicator.alarm` | Pressione fuori intervallo |

**Astronomia e posizione**

| Oggetto | Tipo | Ruolo | Descrizione |
|---------|------|-------|-------------|
| `astro.sunrise` / `astro.sunset` / `astro.solarNoon` | string | `text` | Orari solari per la posizione |
| `astro.isNight` | boolean | `indicator` | È attualmente notte |
| `location.latitude` / `location.longitude` | number | `value.gps.*` | Coordinate risolte |
| `location.resolvedAddress` | string | `text` | Indirizzo risolto |

**Accoppiamento con il feeder** (creato solo quando l'accoppiamento con il feeder è abilitato)

| Oggetto | Tipo | Ruolo | Descrizione |
|---------|------|-------|-------------|
| `feeder.pauseActive` | boolean | `indicator` | Aerazione in pausa per l'alimentazione |
| `feeder.pauseUntil` | number | `value.time` | Pausa attiva fino a |
| `feeder.lastFeedStart` | number | `value.time` | Ultimo inizio dell'alimentazione |

**Modalità inverno / anti-ghiaccio** (creati solo quando la modalità inverno è abilitata)

| Oggetto | Tipo | Ruolo | Descrizione |
|---------|------|-------|-------------|
| `winter.active` | boolean | `indicator` | La modalità inverno sta attualmente forzando l'aerazione in accensione |
| `winter.frostActive` | boolean | `indicator` | La protezione antigelo è attiva (fa abbastanza freddo) |

**Statistiche**

| Oggetto | Tipo | Ruolo | Descrizione |
|---------|------|-------|-------------|
| `aeration.point.<n>.runtimeTodaySec` | number | `value` | Tempo di funzionamento del punto `<n>` odierno (secondi) |
| `aeration.point.<n>.runtimeTotalH` | number | `value` | Tempo di funzionamento totale del punto `<n>` (ore) |
| `statistics.compressorRuntimeTodayH` | number | `value` | Tempo di funzionamento del compressore odierno (ore) |
| `statistics.switchCyclesToday` | number | `value` | Cicli di commutazione delle valvole odierni |

Quando un punto, un gruppo o un sensore viene rimosso dalla configurazione, i suoi oggetti vengono
ripuliti automaticamente.

## 7. Roadmap

Fatto: interfaccia di configurazione, controllo delle valvole (programma/round-robin/gruppi), il
blocco di sicurezza contro il dead-heading, il monitoraggio, astro & geolocalizzazione,
l'accoppiamento con il feeder, la **modalità inverno / anti-ghiaccio**, il **circuito chiuso
dell'ossigeno**, le **notifiche**, le **statistiche di funzionamento**, la **modalità di test
dry-run** e il backend hardware **ESP32** diretto con il suo firmware di riferimento (che flashi nel
browser dalla [pagina di flash del firmware](https://ssbingo.github.io/pond-aeration-flash/)).
**Ancora da fare:**

* un successivo **adattatore di widget vis-2** per il funzionamento e il monitoraggio.

Per il piano completo, basato su milestone, vedi [PROJECT_PLAN.md](../../PROJECT_PLAN.md).

---

📖 [Documentazione principale (inglese)](../../README.md)
