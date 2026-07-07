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

> ⚠️ **Stato del progetto.** Completamente implementato e configurabile dall'admin: il controllo delle
> valvole (programma orario, ciclo a rotazione round-robin, gruppi), il **blocco di sicurezza** contro
> il dead-heading, il **monitoraggio** (ossigeno, temperatura aria/acqua, pressione con allarmi), gli
> **orari astronomici & la geolocalizzazione**, l'**accoppiamento con il feeder**, la **modalità
> inverno / anti-ghiaccio**, il **circuito chiuso dell'ossigeno**, le **notifiche tramite un
> adattatore di messaging**, le **statistiche di funzionamento** e una **modalità di test dry-run**.
> **Ancora pianificato:** il backend hardware **ESP32** diretto. Finché il backend ESP32 non sarà
> disponibile, le valvole e la pompa vengono pilotate tramite stati ioBroker esistenti.

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

Le valvole e la pompa vengono pilotate tramite **stati ioBroker esistenti** (da qualsiasi adattatore
che esponga gli interruttori). Un backend hardware **ESP32** diretto (senza un'ulteriore istanza
ioBroker) è pianificato.

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
  tramite gli stati di altri adattatori. `ESP32 (diretto)` è *pianificato* (M7) e non ancora attivo.
- **Intervallo di polling (s)** – ogni quanto viene interrogato lo stato del backend (ad es. `30`).

### Punti di aerazione
Il cuore della configurazione. Aggiungi **fino a 8** punti; ciascun punto è una valvola. Per ogni
punto:
- **Nome** – ad es. `Pier`, `Deep zone`.
- **Abilitato** – includere questo punto nel controllo.
- **Backend** – `ioBroker` (uno stato esterno) o `ESP32` (un canale relè, pianificato).
- **Stato valvola / canale** – per il backend ioBroker, scegli lo stato interruttore che apre la
  valvola (tramite il browser degli oggetti); per ESP32, il numero del canale.

### Gruppi
Raggruppa i punti per commutarli insieme (ad es. un pulsante apre più diffusori). Assegna un nome al
gruppo e spunta i punti che ne fanno parte. **Non ci possono mai essere più gruppi che punti.**

### Controllo
- **Ciclo a rotazione (round-robin)** – scorrere i punti a turno, ciascuno aperto per il **tempo di
  permanenza** (secondi).
- **Programmi orari** – aprire punti/gruppi selezionati durante una fascia oraria per giorno della
  settimana (`Da`/`A`, ad es. `08:00`–`18:00`; sono supportate fasce che attraversano la notte come
  `22:00`–`06:00`). Un programma attivo ha **priorità sul round-robin**.
- **Modalità inverno / anti-ghiaccio** – durante la stagione configurata (**Inizio**/**Fine** come
  `MM-DD` ricorrente, ad es. `11-01`–`03-15`, con passaggio oltre il nuovo anno) i punti selezionati
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
- **Valvole aperte min. mentre la pompa è in funzione** – la protezione contro il dead-heading
  (predefinito `1`).
- **Intervallo del watchdog (s)** e **sovrapposizione make-before-break (s)**.
- **Pompa** – se è controllabile (allora il blocco può spegnerla), il suo stato e i tempi minimi di
  accensione/spegnimento contro i cicli troppo brevi.
- **Valvola di emergenza** – il suo stato, se è **normalmente aperta** (fail-safe), il **tipo** di
  valvola (elettrovalvola o valvola a sfera motorizzata) e, per una valvola motorizzata, il suo
  **tempo di corsa**.

### Notifiche
Abilita le notifiche e scegli un'**istanza di messaging** (un qualsiasi adattatore di tipo
`messaging`, ad es. Telegram o Pushover). L'adattatore invia quindi un breve messaggio localizzato
quando il blocco di sicurezza interviene o si disattiva, quando l'allarme dell'ossigeno scatta o
rientra, e quando la pressione esce dal suo intervallo o vi rientra.

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
l'accoppiamento con il feeder, la modalità inverno / anti-ghiaccio, il circuito chiuso dell'ossigeno,
le notifiche, le statistiche di funzionamento e la modalità di test dry-run. **Ancora da fare:**

* il backend hardware **ESP32** diretto + firmware di riferimento (Waveshare ESP32-S3-POE-ETH-8DI-8RO);
* un successivo **adattatore di widget vis-2** per il funzionamento e il monitoraggio.

Per il piano completo, basato su milestone, vedi [PROJECT_PLAN.md](../../PROJECT_PLAN.md).

---

📖 [Documentazione principale (inglese)](../../README.md)
