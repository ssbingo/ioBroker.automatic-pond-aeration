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

> ⚠️ **Stato del progetto: prima impalcatura / lavori in corso.** Questa versione predispone lo
> scheletro dell'adattatore (ciclo di vita, oggetti di base, modello di configurazione e le fondamenta
> del blocco di sicurezza). Il motore di controllo, i backend hardware e le funzioni di monitoraggio
> vengono aggiunti passo dopo passo (milestone dopo milestone). Non è ancora destinata all'uso in
> produzione.

---

## Indice

1. [Cosa fa l'adattatore](#1-cosa-fa-ladattatore)
2. [Concetto di sicurezza](#2-concetto-di-sicurezza)
3. [Requisiti](#3-requisiti)
4. [Installazione](#4-installazione)
5. [Panoramica della configurazione](#5-panoramica-della-configurazione)
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

Le valvole e la pompa possono essere pilotate tramite **stati ioBroker esistenti** (da qualsiasi
adattatore che esponga gli interruttori) oppure **direttamente su un ESP32** con il firmware
companion.

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
* Una o più valvole raggiungibili come stati ioBroker, oppure un ESP32 con il firmware companion.

## 4. Installazione

Installa l'adattatore dall'admin di ioBroker (oppure, in fase di sviluppo, dal repository GitHub) e
crea un'istanza. Apri le impostazioni dell'istanza per configurarlo.

## 5. Panoramica della configurazione

La pagina delle impostazioni cresce con le milestone. Sezioni previste: generale/backend, punti di
aerazione, controllo (programma/round-robin/gruppi), sensori, astro & posizione, accoppiamento con il
feeder, sicurezza e notifiche. Per il progetto completo vedi [PROJECT_PLAN.md](../../PROJECT_PLAN.md).

## 6. Oggetti / punti dati

| Oggetto | Tipo | Ruolo | Descrizione |
|---------|------|-------|-------------|
| `info.connection` | boolean | `indicator.connected` | Adattatore in funzione / configurazione valida |
| `control.enabled` | boolean (scrivibile) | `switch.enable` | Abilitazione principale (comando) |
| `safety.interlockActive` | boolean | `indicator.alarm` | Blocco di sicurezza attualmente attivo |

Altri punti dati (per punto di aerazione, gruppi, sensori, sicurezza e statistiche) vengono aggiunti
man mano che le relative funzioni vengono implementate; ogni nuovo stato sarà documentato qui.

## 7. Roadmap

Per il piano di implementazione completo, basato su milestone (motore di controllo, backend HAL,
firmware ESP32, monitoraggio, accoppiamento con il feeder, modalità invernale e il successivo
adattatore di widget vis-2), vedi [PROJECT_PLAN.md](../../PROJECT_PLAN.md).

---

📖 [Documentazione principale (inglese)](../../README.md)
