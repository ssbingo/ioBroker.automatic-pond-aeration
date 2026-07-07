# Projektplan – ioBroker.automatic-pond-aeration

> Adapter zur **Steuerung und Überwachung einer Teichbelüftung** über Magnetventile an bis zu
> **8 Belüftungsstellen**, mit Zeitplan-, Rundlauf- und Gruppensteuerung, optionaler Sauerstoff-,
> Temperatur-, Wassertemperatur- und Drucküberwachung, Astro-/Geolocation-Funktionen,
> optionaler Direktansteuerung eines ESP32 (ohne weitere ioBroker-Instanz) sowie Kopplung an
> `ioBroker.automatic-feeder`.
>
> Dieses Dokument ist der **Umsetzungsplan**. Verbindliche Grundlage ist das Regelwerk
> `iobroker-adapter-rules` (Memory) inkl. aller darin verlinkten offiziellen ioBroker-Quellen.
> Erstellt: 2026-07-07.

---

## 0. Leitplanken aus dem Regelwerk (Kurzabgleich)

| Regel | Konsequenz für dieses Projekt |
|------|-------------------------------|
| R1 | Fremd-States (vorhandene Ventil-/Pumpen-/Sensor-Schalter) nur **steuern** (`setForeignStateAsync(id, val, false)`), nie erfinden; Sensoren via `subscribeForeignStates` + `getForeignStateAsync` lesen. Gilt für den **ioBroker-Backend**; der ESP32-Backend spricht Hardware direkt an. |
| R2 | Eigene DPs mit `setObjectNotExistsAsync`, korrekte `role/type/read/write`; Status ack=true, Kommandos write:true → in `onStateChange` mit ack=false verarbeiten, dann ack=true. |
| R3 | **Alle** Timer/Intervalle in `onUnload` clearen (`this.setTimeout/this.setInterval` nutzen → Auto-Cleanup), `callback()` immer. |
| R4 | Keine `*`-Subscriptions – nur gezielte Fremd-States/Objekte abonnieren. |
| R5/R6 | Config in `onReady` validieren, sauberes Logging mit Backticks, durchgängig async/await, kein `console.log`. |
| R7/R14/R20 | i18n + Doku vollständig in **11 Sprachen**, strukturell identisch, laienverständlich, jeder State in Objekt-Tabellen. |
| R8 | Entfernte Belüftungsstellen/Gruppen → zugehörige Objekte aufräumen (`delObjectAsync` rekursiv). |
| R10 | `npm run lint`, `npm run check`, `npm test` grün; repochecker-konform. |
| R11 | **Konflikt** – siehe §7 „Offene Entscheidung 1" (Admin-UI). |
| R12 | Geolocation verpflichtend für Astro/Nachtlogik; Nominatim nur auf Knopfdruck, mit User-Agent, debounced. |
| R13/R15/R16/R17 | README-Struktur: Buy-me-a-coffee-Block, max. 10 Changelog-Einträge (Rest → `CHANGELOG_OLD.md`), Doku-Linkblock, `news` nur aktuelle Version. |
| R18/R19 | **Zwingend** offizielle Best-Practices + Review-Checklist + repochecker + Responsive-Design-Initiative einhalten. |
| R21 | npm-Publish via **Trusted Publisher (OIDC)**, kein `NPM_TOKEN`; Repo-Casing exakt; erster Publish manuell. |
| R22 | Gerüst mit `@iobroker/create-adapter` erzeugen. |

**Aus der Recherche der offiziellen Quellen zusätzlich verbindlich:**
`this.setTimeout/this.setInterval` statt bare Timer (E5004), `this.terminate()` statt `process.exit()` (E5049/E5050),
`setObjectNotExists`/`extendObject` statt `setObject` (W5052), `info.connection`-State Pflicht, `encryptedNative`+`protectedNative`
für Secrets, gültige State-Rollen (STATE_ROLES.md), Tests grün (E3000), Tag-getriggerter Release-Run (W3032),
Provenance/Trusted-Publishing (S3018), Node ≥ 20, js-controller-Mindestversion aus aktuellem repochecker ziehen.

---

## 1. Fachliche Analyse & Domänenwissen

### 1.1 Was eine Teichbelüftung physikalisch tut
Ein **Luftkompressor/Pumpe** drückt Luft über Schläuche zu **Ausströmern/Diffusoren** an mehreren Stellen im Teich.
**Magnetventile** verteilen die Luft auf die einzelnen Belüftungsstellen. Typische Zwecke: Sauerstoffeintrag im
Sommer/nachts, Umwälzung, **eisfreies Loch im Winter** (Faulgasabzug → verhindert Fischsterben unter Eis).

### 1.2 Sicherheits-Kernproblem (bestimmt die Architektur)
Ein Luftkompressor darf **nie gegen komplett geschlossene Ventile** laufen („Deadhead") → Überdruck, Überhitzung,
Defekt. Daraus folgen die harten Anforderungen des Auftrags:

- **Bei laufender Pumpe muss immer ≥ 1 Ventil offen sein.**
- Andernfalls: **Notventil öffnen** und – falls als Datenpunkt verfügbar – **Pumpe abschalten**.

**Design-Empfehlungen dazu (fließen in den Plan ein):**
1. **Notventil als Öffner (NO)** verdrahten → fällt bei Stromausfall automatisch auf – echte Failsafe. (Doku-Hinweis an Anwender.)
2. **„Make-before-break"** beim Umschalten (Rundlauf/Gruppen): nächstes Ventil öffnen, bevor das vorige schließt → nie ein Moment mit „alle zu" + kein Wasserschlag/Druckstoß.
3. **On-Device-Watchdog auf dem ESP32** (siehe §4): Die ≥1-Ventil-Regel und Pumpen-Abschaltung laufen **auch lokal** auf der Hardware, damit ein Netzwerk-/Adapter-Ausfall nie zum Kompressor-Schaden führt. Der Adapter ist Leitstelle, der ESP die letzte Sicherheitsinstanz (Heartbeat).
4. **Kompressor-Schutz**: konfigurierbare Mindest-Ein-/Ausschaltzeit (Anti-Takt).

### 1.3 Die drei Steuer-Paradigmen
- **Zeitplan** – zeitbasiertes Ein/Aus je Stelle/Gruppe (Wochentage + Zeitfenster).
- **Zyklische Rundläufe** – reihum je Stelle X Sekunden aktiv (Verweildauer, Reihenfolge, Overlap).
- **Gruppensteuerung** – Ventile werden gruppiert; Steuerung erfolgt gruppenweise.
  **Harte Regel:** *nie mehr Gruppen als Ventile* (`Anzahl Gruppen ≤ Anzahl Belüftungsstellen`) – in Config-Validierung + Admin-UI erzwingen.

### 1.4 Steuer-Quellen-Konflikt → Arbitrierung nötig
Mehrere Quellen wollen gleichzeitig Ventile schalten (Zeitplan, Rundlauf, Gruppe, O₂-Regelung, Feeder-Pause,
Handbetrieb, Sicherheit). Es braucht eine **klare Prioritäts-Arbitrierung** (siehe §3.2), sonst „kämpfen" die Module.

---

## 2. Zielbild & Scope

### 2.1 In-Scope (v1)
- Bis zu **8 Belüftungsstellen**, je 1 Ventil; **1 Notventil**; optionale **Pumpe** (steuerbar oder nur beobachtet).
- Steuerung: **Zeitplan**, **Rundlauf**, **Gruppen** (mit Constraint).
- **Sicherheits-Interlock** + Watchdog (höchste Priorität).
- Optional: **O₂-**, **Luft-Temp-**, **Wassertemp-**, **Druck**-Überwachung.
- **Astro-Zeiten** (SunCalc) + **Geolocation** (Nominatim, R12).
- **Backends**: (a) ioBroker-Fremd-States, (b) **ESP32 direkt** (HTTP/WebSocket).
- **Feeder-Kopplung**: Belüftungsstellen während Fütterung pausieren (Offset-Logik).
- Handbetrieb/Override + Laufzeit-/Wartungsstatistik.
- Admin-UI, i18n + Doku in 11 Sprachen, CI, Trusted Publishing.

### 2.2 Out-of-Scope (Folgeprojekt)
- **Eigenständiger vis-2-Widget-Adapter** für Bedienung/Monitoring (animiert, modern) – analog `vis-2-widgets-automatic-feeder`. Der Adapter hier liefert dafür eine **saubere, stabile State-API** als Vertrag.

### 2.3 Nicht-Ziele
- Kein Ersatz für MQTT-/Shelly-/etc.-Adapter, aber optionale Direktkopplung, um „keine weitere Instanz" zu ermöglichen.

---

## 3. Software-Architektur

### 3.1 Schichten
```
┌─────────────────────────────────────────────────────────────┐
│ Admin-UI (JSON-Config + sendTo-Aktionen: Geocode, Feeder-    │
│ Discovery, ESP32-Discovery, Ventil-Test)                     │
├─────────────────────────────────────────────────────────────┤
│ Adapter-Kern (main): onReady / onStateChange / onMessage /   │
│ onUnload; Config-Validierung; Objekt-/State-Verwaltung       │
├───────────────┬───────────────┬─────────────────────────────┤
│ Control-Engine│ Monitoring     │ Integrationen               │
│ - Scheduler   │ - O2/Temp/     │ - Astro (suncalc)           │
│ - RoundRobin  │   Wassertemp   │ - Geolocation (Nominatim)   │
│ - Groups      │ - Druck        │ - Feeder-Kopplung           │
│ - Arbiter     │ - Plausibilität│ - Notifications (sendTo)    │
│ - SAFETY ★    │                │                             │
├───────────────┴───────────────┴─────────────────────────────┤
│ HAL – Hardware Abstraction Layer (Backend-Plugins)           │
│  • IoBrokerBackend (Fremd-States, R1)                        │
│  • Esp32Backend   (HTTP REST + WebSocket)                    │
│  • (später) TasmotaHttp / MQTT                               │
└─────────────────────────────────────────────────────────────┘
```
Der **HAL** kapselt „Ventil N setzen", „Pumpe setzen", „Sensor lesen", „Verbindungsstatus" hinter einem
einheitlichen Interface. Control-Engine und Monitoring kennen **nur** den HAL, nicht die Hardware.

### 3.2 Arbitrierung (Herzstück) – „Desired-State-Resolver"
Pro Regel-Tick berechnet ein **deterministischer, reiner** Resolver den Ziel-Zustand jedes Ventils aus den
aktiven Controllern nach **fester Priorität** (oben schlägt unten):

1. **Sicherheit** (Interlock/Watchdog) – kann Notventil erzwingen, Pumpe stoppen, „≥1 offen" garantieren.
2. **Handbetrieb/Override** (aus UI/Command-States, mit optionalem Auto-Timeout).
3. **Feeder-Pause** (erzwingt ausgewählte Stellen **AUS** für die Offset-Dauer).
4. **O₂-Bedarfsregelung** (falls aktiv; Hysterese).
5. **Zeitplan**.
6. **Rundlauf / Gruppen-Grundprogramm**.

Danach durchläuft das Ergebnis **immer** den **Safety-Validator** (reine Funktion), bevor es via HAL ausgegeben
wird: erzwingt „≥1 offen bei laufender Pumpe", Make-before-break, Anti-Takt, Notventil-Regel.
→ **Beide Funktionen (Resolver + Validator) sind pure functions und damit direkt unit-testbar** (siehe §9).

### 3.3 Modul-/Datei-Struktur (TypeScript, aus create-adapter)
```
src/
  main.ts                      Adapter-Klasse, Lifecycle, Verdrahtung
  lib/
    adapter-config.d.ts        Typen der native-Config (generiert/gepflegt)
    objects.ts                 Objekt-/State-Definitionen + Anlegen/Aufräumen
    config-validation.ts       Config prüfen (Gruppen≤Ventile, Mappings, Geo …)
    hal/
      backend.ts               Interface HardwareBackend
      iobroker-backend.ts      Fremd-States (R1)
      esp32-backend.ts         HTTP + WebSocket, mDNS, Heartbeat
    control/
      arbiter.ts               Desired-State-Resolver (pure)
      safety.ts                Safety-Validator + Interlock (pure Kernlogik)
      scheduler.ts             Zeitplan
      round-robin.ts           Rundlauf (make-before-break)
      groups.ts                Gruppen
      oxygen-control.ts        O2-Regelung (Hysterese, temp-kompensiert)
    monitoring/
      sensors.ts               O2/Temp/Wassertemp/Druck lesen + Alarme
    integration/
      astro.ts                 suncalc, Tag/Nacht
      geolocation.ts           Nominatim (debounced, User-Agent)
      feeder.ts                Feeder-Discovery + Pause-Logik
      notify.ts                sendTo an messaging-Adapter
  main.test.ts                 Beispieltest (aus Gerüst)
test/                          package/integration (aus Gerüst)
admin/                         jsonConfig.json + i18n (siehe §7)
```

---

## 4. ESP32-Direktansteuerung (Kernanforderung „keine weitere Instanz")

> **Zielhardware steht fest:** Waveshare **ESP32-S3-POE-ETH-8DI-8RO** (8 Relais via TCA9554, 8 DI, PoE-Ethernet).
> Details, Pin-/Kanal-Map und die konkreten Design-Konsequenzen (Relais-Budget, Failsafe-Verdrahtung,
> Kommunikationsweg PoE-Ethernet) in **[Anhang A](#anhang-a--zielhardware-m7-waveshare-esp32-s3-poe-eth-8di-8ro)**.

**Empfehlung: eigenes, dokumentiertes JSON-Protokoll über HTTP + WebSocket, mit Referenz-Firmware.**

- **Transport:** REST für Kommandos/Konfig, **WebSocket** für Echtzeit-Statuspush (niedrige Latenz für Sicherheit).
  Optional **mDNS** (`_pondaer._tcp`) für Auto-Discovery im Admin.
- **API (Entwurf):**
  - `GET /api/info` → Firmware-Version, Ventilanzahl, Feature-Flags (O2/Druck/Pumpe).
  - `GET /api/status` → `{valves:[…], emergency:bool, pump:bool, pressure, o2, tempAir, tempWater, uptime}`.
  - `POST /api/valve` `{index, open}` · `POST /api/emergency` · `POST /api/pump` `{on}`.
  - `POST /api/config` (Ventilanzahl, Failsafe-Parameter) · `WS /ws` (Status-Stream + Heartbeat).
- **On-Device-Failsafe (essentiell):** Die Firmware hält einen **Heartbeat-Timer**. Bleibt der Adapter-Kontakt aus
  (Netz weg / ioBroker down), geht der ESP eigenständig in den **sicheren Zustand**: Notventil auf, Pumpe aus.
  Die Deadhead-Schutzlogik existiert damit **doppelt** (Adapter + Firmware). Das ist der entscheidende Grund,
  Hardware direkt anzusprechen statt „dumm" fernzusteuern.
- **Referenz-Firmware:** eigenes Repo (z. B. `pond-aeration-esp32-firmware`, Arduino/ESP-IDF), Open Source,
  **protokoll-versioniert** (`/api/info.protocol`). Adapter prüft Kompatibilität und warnt bei Mismatch.
- **Alternativ-Backend „Generic REST/Tasmota":** Für Anwender mit vorhandener Tasmota-Firmware ein Mapping auf
  deren HTTP-Command-API – ebenfalls **ohne** zusätzliche Instanz. (v1.1, optional.)
- **Secrets** (falls Firmware Auth nutzt): `encryptedNative` + `protectedNative`.

> **Bewusst vermieden:** MQTT als Pflicht – ein Broker wäre „eine weitere Instanz" und widerspricht dem Ziel.
> MQTT bleibt als späteres optionales Backend denkbar.

---

## 5. Datenmodell (eigene Objekte/States) – Entwurf

Rollen gemäß STATE_ROLES.md; Status ack=true, Kommandos write:true. `<n>` = 0..7.

**info**
- `info.connection` (bool, `indicator.connected`) – HAL-Backend verbunden (Pflicht).
- `info.backend` (string) – aktiver Backend-Typ. · `info.activeMode` (string).

**control (Kommandos, write:true)**
- `control.enabled` (bool, `switch.enable`) – Master-Ein/Aus.
- `control.mode` (string: `auto|manual|off`).
- `control.point.<n>.open` (bool, `switch`) – Hand-Kommando je Stelle.
- `control.group.<g>.active` (bool, `switch`).
- `control.allOff` / `control.testValve` (Button, `button`).

**aeration (Status)**
- `aeration.point.<n>.name` (string) · `.valveState` (bool, `indicator`) · `.active` (bool) ·
  `.runtimeTodaySec` (number, `value`) · `.runtimeTotalH` (number, `value` – Wartung) · `.lastChange` (number, `value.time`).
- `aeration.point.<n>.error` (string) – z. B. „stuck", „no pressure response".

**groups**
- `groups.<g>.name` · `groups.<g>.members` (string/JSON) · `groups.<g>.active` (bool).

**safety**
- `safety.interlockActive` (bool, `indicator.alarm`) · `safety.emergencyValve` (bool, `indicator`) ·
  `safety.lastTripReason` (string) · `safety.pumpRunning` (bool, `indicator`) · `safety.openValveCount` (number).

**sensors** (nur wenn aktiviert)
- `sensors.oxygen` (number, `value` mg/l) · `sensors.oxygenSaturation` (number, `value` %) ·
  `sensors.airTemperature` (`value.temperature`) · `sensors.waterTemperature` (`value.temperature`) ·
  `sensors.pressure` (number, `value.pressure`) · `sensors.pressureAlarm` (bool, `indicator.alarm`) ·
  `sensors.oxygenAlarm` (bool, `indicator.alarm`).

**astro / location**
- `astro.sunrise` · `astro.sunset` · `astro.solarNoon` · `astro.isNight` (bool) (Rollen `date`/`indicator`).
- `location.latitude` · `location.longitude` · `location.resolvedAddress`.

**feeder**
- `feeder.pauseActive` (bool, `indicator`) · `feeder.pauseUntil` (number, `value.time`) · `feeder.lastFeedStart`.

**statistics / alarms**
- `statistics.compressorRuntimeTodayH` · `statistics.switchCyclesToday` · `alarms.active` (JSON-Liste).

> Bei Reduktion der Stellenzahl / Gruppen: obsolete Channels+Substates via `delObjectAsync(..., {recursive:true})` entfernen (R8).

---

## 6. Konfiguration (io-package.json `native` + Admin)

**Allgemein:** `masterEnable`, `controlBackend` (`iobroker|esp32|tasmota`), `pollIntervalSec`, `logVerbose`.
**ESP32:** `esp32Host`, `esp32Port`, `esp32UseWebsocket`, `esp32AuthToken` (encrypted), Discovery-Button.
**Belüftungsstellen:** `pointCount` (1–8); Tabelle je Stelle: `name`, `backendRef` (Fremd-State-ID **oder** ESP-Kanalindex), `enabled`.
**Pumpe:** `pumpRef`, `pumpControllable` (bool), `pumpMinOnSec`, `pumpMinOffSec`.
**Notventil:** `emergencyRef`, `emergencyNormallyOpen` (bool).
**Sicherheit:** `minOpenValves` (Default 1), `watchdogIntervalSec`, `overlapSec` (make-before-break), `actionOnFault` (`emergency+stopPump`).
**Zeitplan:** Liste `{targets, days[], from, to}`.
**Rundlauf:** `enabled`, `order[]`, `dwellSecPerPoint`, `overlapSec`.
**Gruppen:** Liste von Gruppen mit Member-Indizes; **Validierung `groups ≤ pointCount`**.
**O₂:** `enabled`, `sourceRef`, `lowThreshold`, `targetThreshold`, `hysteresis`, `tempCompensation` (bool).
**Temp/Wassertemp:** `enabled`, `airTempRef`, `waterTempRef`.
**Druck:** `enabled`, `sourceRef`, `minPressure`, `maxPressure`, `actionOnOver`.
**Astro/Geo:** `address` (Freitext), Geocode-Button (Nominatim), `latitude`, `longitude`, `nightBehavior`.
**Feeder:** `enabled`, `feederInstance` (Auswahl), `feederSwitches[]` (**autodiscovered**, siehe §8), `offsetSec`, `affectedPoints[]`, `feedingDurationMode` (`measure|configured|pulse`).
**Notifications:** `enabled`, `messagingInstance`, Ereignis-Auswahl.

> Alle Zahlen mit sinnvollen Defaults + Grenzen; Secrets in `encryptedNative`/`protectedNative`;
> keine Beispiel-Keys `option1/option2` (E5040).

---

## 7. Admin-UI

### Entscheidung 1 — **React-Admin (materialize) wie der Feeder** ✅ (2026-07-07, revidiert)
- Gewählt: **`adminUI.config = materialize`** mit Custom-**React**-Admin via `index_m.html` (Build `build-adapter react`).
- Grund: `ioBroker.automatic-feeder` (das Vorbild) liefert bereits die benötigten interaktiven Komponenten —
  `LocationPicker` (Leaflet-Geopicker), `ObjectSelect` (Fremd-State-Auswahl), Pro-Element-Tabs mit Auto-Discovery —
  die pond-aeration nahezu 1:1 braucht. Wiederverwendung + Konsistenz zum Vorbild schlagen den JSON-Config-Vorteil.
- Auflage: **Responsive-Design (R19) im React-Layout selbst** erfüllen (flexible Breiten, Mobil-Test);
  Legacy-Materialize-Warnungen des repochecker sauber halten. Regel 11 entsprechend zurück auf React/materialize gestellt.
- **Sprache: JavaScript** (nicht TS) – gesamte Flotte ist JS; Typecheck via `tsc --noEmit -p tsconfig.check.json`.

### UI-Aufbau (bei JSON-Config)
Tabs: **Allgemein/Backend**, **Belüftungsstellen**, **Steuerung** (Zeitplan/Rundlauf/Gruppen), **Sensoren**,
**Astro & Standort**, **Feeder-Kopplung**, **Sicherheit**, **Benachrichtigungen**.
Interaktive `onMessage`-Aktionen: `discoverEsp32`, `testValve`, `geocodeAddress`, `discoverFeederSwitches`,
`listMessagingInstances`. Responsive Breiten (`xs:12 sm:12 md:6 lg:4`), Mobil getestet.

---

## 8. Feeder-Kopplung (`ioBroker.automatic-feeder`)

**Discovery:** Bei aktivierter Option liefert ein `onMessage`-Handler die Schalter der gewählten Feeder-Instanz
als `{value:id, label:name}`-Liste (aus deren Objektbaum, Rolle `switch`) → JSON-Config-Select (Anforderung erfüllt).

**Pause-Logik (Kernanforderung):** *15 s Fütterung + 60 s Offset ⇒ 75 s Belüftung aus ab Fütterungsstart.*
- Adapter abonniert **gezielt** die gewählten Feeder-Schalter (R4).
- **Robuster Weg (empfohlen), `feedingDurationMode = measure`:** Bei **steigender Flanke** (Fütterungsstart)
  ausgewählte Stellen **AUS** (Priorität 3 im Arbiter). Bei **fallender Flanke** (Fütterungsende) **Offset-Timer**
  starten; nach `offsetSec` Belüftung wieder freigeben. → ergibt exakt „Fütterdauer + Offset", **ohne** die
  Fütterdauer vorher kennen zu müssen.
- **Fallbacks:** `configured` (Fütterdauer aus Feeder-Config/Freigabe lesen) bzw. `pulse` (Feeder feuert nur
  kurzen Impuls → Anwender gibt Fütterdauer an; Pause = Dauer + Offset ab Start).
- **Anwender-Hinweis (helpText, mehrsprachig):** „Der Offset sollte mindestens die Zeit sein, die die Tiere im
  Schnitt zum Fressen brauchen."
- **Entkopplung:** Feeder abwesend/deaktiviert → Modul inaktiv, keine Fehler; nur die ausgewählten Stellen sind
  betroffen, der Rest läuft weiter.

---

## 9. Qualität, Tests, Sicherheitstests

- **Unit-Tests (Kern):** `arbiter` + `safety` als pure functions → Edge-Cases hart testen:
  Pumpe an + alle zu → Notventil + Pumpe aus; `groups > pointCount` → abgelehnt; Feeder-Offset-Mathematik;
  make-before-break; Anti-Takt; Hysterese O₂.
- **@iobroker/testing:** `test:package` (io-package/package valide) + `test:integration` (echte js-controller-Instanz).
- **Mock-HAL:** simulierter ESP32-Backend für Integrationstests ohne Hardware (auch „Dry-Run"-Modus, §11).
- **Gates:** `npm run lint` (`@iobroker/eslint-config`, Flat-Config), `npm run check` (`tsc --noEmit`), `npm test`.
- **repochecker** (`npx @iobroker/repochecker` / adapter-check.iobroker.in) → 0 Errors, Warnings möglichst 0.
- **Verify-Skill** vor nichttrivialen Commits: relevanten Flow real durchspielen.

---

## 10. CI/CD & Release (Regel 21)

- Gerüst-Workflow `.github/workflows/test-and-release.yml`: lint+check+test-Matrix (Node 20/22), Deploy bei Tag `vX.Y.Z`.
- **Trusted Publisher (OIDC):** Deploy-Job `permissions: id-token: write`, npm ≥ 11.5.1 (ggf. `npm i -g npm@latest`),
  `npm publish --provenance`, **kein** `NPM_TOKEN`. Repo-Casing exakt `ssbingo/ioBroker.automatic-pond-aeration`.
- **Erster Publish manuell** (Henne-Ei), danach TP verknüpfen → jeder Tag published automatisch mit Provenance.
- Dependabot (Cooldown ≥ 7 Tage), `iobroker*`-Actions mit versioniertem Tag (nicht `@master`).

---

## 11. Verbesserungs-/Erweiterungsideen (meine Ergänzungen)

**Sicherheit/Zuverlässigkeit (empfohlen für v1):**
- ★ **On-Device-Watchdog & Failsafe** auf dem ESP32 (Heartbeat) – Deadhead-Schutz unabhängig vom Netzwerk.
- ★ **Notventil als Öffner (NO)** – Failsafe bei Stromausfall (Doku-Hinweis).
- ★ **Make-before-break** Umschaltung – kein „alle zu"-Moment, kein Wasserschlag.
- **Kompressor-Anti-Takt** (Mindest-Ein/Aus). · **Sensor-Plausibilität** (Wertebereich, Timeout → Sensor-Ausfall-Alarm).
- **Stuck-Valve-Erkennung** über Druck-Reaktion (Ventil auf, aber Druck ändert sich nicht → Fehler).

**Funktion/Komfort:**
- **Winter-/Eisfrei-Modus** (Frostschutz) – für Teiche zentral: bei Frost definierte Stelle dauerhaft/getaktet belüften.
- **Nacht-Boost über Astro** – O₂ ist kurz vor Sonnenaufgang am niedrigsten (keine Photosynthese) → nächtliche Verstärkung.
- **O₂-Regelkreis** mit **temperaturkompensierter Sättigung** (wärmeres Wasser bindet weniger O₂ → mehr Belüftung).
- **Laufzeit-/Wartungszähler** je Ventil + Diffusor-Reinigungserinnerung.
- **Energie-/Kostenschätzung** der Kompressorlaufzeit.
- **Benachrichtigungen** (Telegram/Pushover via generischem `sendTo`) bei Alarmen.
- **Dry-Run/Simulationsmodus** (ohne Hardware) für Test/Demo und die spätere Widget-Entwicklung.
- **History-tauglich**: States mit sinnvollen Rollen; `custom`-Settings nur via `extendObject` (nicht überschreiben).
- **Config-Backup/Restore** für Gruppen/Zeitpläne.

**Für das Folge-Widget:** stabile, dokumentierte **State-API als Vertrag** (Namen/Rollen einfrieren), damit der
Widget-Adapter darauf aufsetzen kann.

---

## 12. Umsetzungs-Phasen (Meilensteine)

| M | Ziel | Wesentliche Ergebnisse | Abschlusskriterium |
|---|------|------------------------|--------------------|
| **M0** | Gerüst | `@iobroker/create-adapter` (TS, JSON-Config, Node 20, MIT), Repo, CI, README-Grundgerüst (11 Sprachen-Rahmen), erster manueller npm-Publish → TP verknüpfen | lint/check/test grün, repochecker 0 E |
| **M1** | Objekt-/Config-Fundament | Datenmodell (§5), Config-Validierung (§6, inkl. `groups ≤ pointCount`), `info.connection`, onUnload-Cleanup | Objekte werden korrekt angelegt/aufgeräumt |
| **M2** | HAL + ioBroker-Backend | HardwareBackend-Interface, IoBrokerBackend (R1: Fremd-States steuern/lesen), Handbetrieb-States | Ventile/Pumpe über Fremd-States schaltbar |
| **M3** | **Sicherheit** (kritisch) | Safety-Validator + Interlock + Watchdog + Notventil-Logik, make-before-break, Anti-Takt; **Unit-Tests** | Alle Safety-Edge-Cases getestet grün |
| **M4** | Steuer-Engine | Scheduler, RoundRobin, Groups, Arbiter (Priorität), Handbetrieb-Override | Drei Paradigmen + Arbitrierung funktionieren |
| **M4.1** | Logging & Debugging | Umfangreiches, aussagekräftiges Logging auf allen Ebenen (error/warn/**debug**/silly) durchgängig **Englisch** (greppbar); **INFO-Meldungen lokalisiert** an der ioBroker-Systemsprache über `lib/messages.js` (11 Sprachen, `translate()` mit EN-Fallback + `{placeholder}`) | Log deckt Start/Config/Kommandos/Control-Tick/Sicherheit/Backend ab; INFO folgt Systemsprache; error/warn/debug/silly bleiben EN |
| **M5** | Monitoring + Astro/Geo | O₂/Temp/Wassertemp/Druck, Alarme; SunCalc + Nominatim (R12, debounced) | Sensorwerte + Astro-States korrekt |
| **M6** | Feeder-Kopplung | Discovery (`onMessage`) + Pause-Logik (measure/configured/pulse) + Offset | Fütterung pausiert gewählte Stellen korrekt |
| **M7** | ESP32-Backend + Firmware | HTTP/WS-Backend, Discovery, Heartbeat/Failsafe; Referenz-Firmware für **Waveshare ESP32-S3-POE-ETH-8DI-8RO** (8 Relais via TCA9554, 8 DI, PoE-Ethernet) — **hardwaregenau nach [Anhang A](#anhang-a--zielhardware-m7-waveshare-esp32-s3-poe-eth-8di-8ro)** | ESP32 direkt steuerbar, Boot-/Netz-Failsafe getestet |
| **M8** | Admin-UI-Feinschliff | Alle Tabs, sendTo-Aktionen, responsive, i18n 11 Sprachen | Responsive-Design-Initiative erfüllt |
| **M9** | Doku + Release-Härtung | Doku 11 Sprachen (R14/R20), Changelog-Disziplin (R15/R17), Repochecker 0 E/0 W | Release `v0.x`, Aufnahme-Anforderungen erfüllt |
| **M10** | Erweiterungen | Winter-Modus, O₂-Regelkreis, Statistik, Notifications, Dry-Run | nach Priorität |
| **M11** | Widget-Adapter (separat) | eigenes Repo auf Basis der State-API | Folgeprojekt |

Erst **M0** aufsetzen; danach nach Freigabe iterativ. **M3 (Sicherheit) vor M4/M7** – die Hardware-Sicherheit ist Fundament.
**Scope-Festlegung (voller Umfang v1):** M5 (Sensoren/Astro/Geo) und der **Winter-/Eisfrei-Modus** (aus M10) sind
Teil von **v1**; als „v1.x/optional" verbleiben nur Nice-to-haves (Energie-/Kostenschätzung, Config-Backup,
Tasmota-Zusatzbackend). Der ESP32-Firmware-Teil (M7) läuft als **separates Repo** parallel.

---

## 13. Risiken & Gegenmaßnahmen

| Risiko | Gegenmaßnahme |
|--------|---------------|
| Sicherheitskritisches Timing über Netzwerk | **On-Device-Watchdog** auf ESP32 (doppelte Deadhead-Sicherung) |
| ESP32-Firmware-Pflegeaufwand | Separates, **protokoll-versioniertes** Repo; generischer REST/Tasmota-Fallback |
| Nominatim-Limits/Policy (R12) | Nur auf Knopfdruck, Debounce, identifizierender User-Agent, Ergebnis cachen |
| Feeder-Kopplung bricht bei Feeder-Update | Lose Kopplung nur über Fremd-States; defensiv gg. Abwesenheit |
| Regel-11-Konflikt (Admin-UI) | **Vorab entscheiden** (§7), Abweichung dokumentieren |
| Repochecker-Codes verschieben sich | Vor jedem Release aktuellen repochecker laufen lassen; js-controller-Mindestversion daraus ziehen |

---

## 14. Entscheidungen & offene Punkte

**Festgelegt (2026-07-07):**
1. ✅ **Admin-UI: React (materialize) wie der Feeder**; **Sprache JavaScript**. Vorbild-Adapter = `ioBroker.automatic-feeder`. Regel 11 entsprechend zurückgestellt.
2. ✅ **ESP32: eigene Referenz-Firmware + JSON-Protokoll** (HTTP+WebSocket) in **separatem Repo**, mit On-Device-Failsafe.
3. ✅ **Scope v1: voller Funktionsumfang** – inkl. O₂-/Druck-Überwachung, Astro/Geo und Winter-Modus.

**Festgelegt (2026-07-07, Hardware):**
4. ✅ **Pumpe:** Beide Betriebsarten **auswählbar** — `steuerbar` (An/Aus-Datenpunkt vorhanden → Failsafe kann Pumpe abschalten) **oder** `nur beobachtet` (Adapter liest den Pumpenstatus, schaltet aber nicht). Config-Feld `pumpControllable`.
5. ✅ **Notventil:** Typ **anwenderseitig konfigurierbar**. Referenz-Hardware ist ein **Motorkugelhahn CWX-15N**, aber es kann auch ein **Magnetventil** in **NO- oder NC-**Variante zum Einsatz kommen. Config: `emergencyNormallyOpen` (NO/NC) plus (ab M1) `emergencyValveType` = `solenoid | motorBallValve`. **Design-Konsequenz (M3/M7):** Ein Motorkugelhahn hat eine **Stellzeit** (Sekunden) und ggf. Endlagen-Feedback — die Sicherheitslogik muss die Laufzeit berücksichtigen (nicht „sofort auf" wie beim Magnetventil) und darf beim Not-Aus nicht auf sofortiges Öffnen vertrauen.
6. ✅ **`type`** in io-package.json: **`garden`** bestätigt.

---

*Umsetzungsstand (2026-07-07): M0–M5 inkl. M4.1 sind umgesetzt und als 0.0.1–0.0.7 auf GitHub
(JavaScript, React-Admin, Node ≥ 22). Als Nächstes M6 (Feeder-Kopplung), dann M7 (ESP32, siehe
Anhang A), M8 (Admin-UI), M9 (Doku/Release).*

---

## Anhang A — Zielhardware (M7): Waveshare ESP32-S3-POE-ETH-8DI-8RO

> Die verbindliche Zielhardware für den ESP32-Backend + die Referenz-Firmware. Vollständiges
> Datenblatt im Repo: [`dev/hardware/ESP32-S3-POE-ETH-8DI-8RO.md`](dev/hardware/ESP32-S3-POE-ETH-8DI-8RO.md).
> **Ab sofort hardwaregenau darauf aufsetzen.**

### A.1 Kern-Specs (relevant für uns)
- **ESP32-S3-WROOM-1U-N16R8** (16 MB Flash, 8 MB PSRAM), WLAN 2,4 GHz + BLE.
- **8 Relais** (COM/NO/NC, ≤ 10 A/250 V AC bzw. 10 A/30 V DC) über I/O-Expander **TCA9554 (I²C 0x20, Pin 0–7)**.
- **8 Digitaleingänge** DI1–DI8 = **GPIO4–GPIO11** (invertiert, INPUT_PULLUP), optokoppler-isoliert.
- **Ethernet W5500** (SPI: CLK15/MOSI13/MISO14/CS16/INT12) + **PoE 802.3af**; **RS485** isoliert (TX17/RX18, Modbus-RTU, 9600).
- I²C-Bus SDA42/SCL41 (TCA9554 + RTC PCF85063); **Summer GPIO46**, **RGB-LED WS2812 GPIO38**, Boot GPIO0.
- Versorgung: **PoE** *oder* 7–36 V DC *oder* 5 V USB-C. Vollständig isoliert, Hutschiene.

### A.2 Kommunikationsweg (Adapter ↔ Board) — Entscheidung
Ziel ist „keine weitere ioBroker-Instanz". Daher:
- **Primär: PoE-Ethernet (W5500)** → ein Kabel für Strom + Daten, galvanisch getrennt, robust (ideal am Teich).
  Die **eigene Referenz-Firmware** exponiert unser **HTTP-REST + WebSocket-JSON-Protokoll** (siehe §4) direkt.
- **WLAN** als Fallback (eigene Firmware kann Ethernet primär + WLAN-Fallback; die ESPHome-Einschränkung
  „Ethernet XOR WLAN" gilt nur für ESPHome, nicht zwingend für eigene Firmware).
- **Bewusst NICHT** als Standardweg: ESPHome-native-API (bräuchte ESPHome-Adapter), MQTT/Waveshare-Cloud
  (bräuchte Broker) und RS485-Modbus-Steuerung (bräuchte Modbus-Adapter) — alle = „weitere Instanz".

### A.3 Relais-Belegung & -Budget (WICHTIG)
`setValve(i)` schaltet **TCA9554-Pin i** (I²C 0x20). Es gibt **nur 8 Relais gesamt** — Belüftungsstellen,
Notventil und (steuerbare) Pumpe teilen sich diese 8 Kanäle:

| Konfiguration | Belegte Relais | Max. Belüftungsstellen / 1 Board |
|---|---|---|
| Notventil (1) + steuerbare Pumpe (1) | 2 | **6** |
| Notventil (1), Pumpe extern/immer-an | 1 | **7** |
| kein Notventil-Relais (passiv) + keine Pumpensteuerung | 0 | **8** |
| Motorkugelhahn-Notventil **3-Draht (2 Relais)** + Pumpe (1) | 3 | **5** |

→ **Konsequenz:** Die Produktobergrenze „8 Belüftungsstellen" ist auf **einem** Board nur ohne Relais für
Notventil/Pumpe erreichbar. Für 8 Stellen **plus** Notventil/Pumpe braucht es ein **zweites Board** oder
externe Kontaktoren. **Firmware + Adapter benötigen daher eine konfigurierbare Kanal-Zuordnung**
(Punkt→Relaisindex, Notventil→Relais, Pumpe→Relais) **und eine Warnung bei Überbuchung** (> 8 Ausgänge).

### A.4 Failsafe-Verdrahtung (Deadhead-Schutz, ergänzt M3)
Relais sind bei **Stromausfall und beim Boot de-energisiert** → der de-energisierte Zustand **muss** der sichere
sein. Empfohlenes Prinzip (gegen Schaltplan + Ventil-Datenblatt prüfen):

| Aktor | Ventiltyp | Relais/Spule | Normalbetrieb | Stromlos (Power-Loss/Boot) |
|---|---|---|---|---|
| Belüftungsventil | Magnet **NC** | Spule an COM–NO | Relais AN = Ventil **auf** | Ventil **zu** (sicher) |
| Notventil (Relief) | Magnet **NO** | Spule an COM–NO | Relais AN = Ventil **zu** | Ventil **auf** (Relief) ✔ Failsafe |
| Pumpe | via Kontaktor | Kontaktor an COM–NO | Relais AN = Pumpe **an** | Pumpe **aus** ✔ |

- **Firmware setzt beim Boot sofort sichere Defaults** (Notventil auf, Ventile zu, Pumpe aus), **bevor** das
  Netzwerk verbunden ist.
- **Motorkugelhahn (CWX-15N) als Notventil — Achtung:** ein Motorkugelhahn **federt nicht selbsttätig auf** und
  bleibt bei Stromausfall in seiner Position. Er ist damit **kein** „fail-open"-Relief. Dann muss der
  **Deadhead-Schutz über die Pumpe** greifen (Pumpe im selben Stromkreis → fällt mit aus). **Empfehlung für echte
  Failsafe: Notventil als NO-Magnetventil** (siehe Entscheidung 5). Motorkugelhahn ggf. **2 Relais** (auf/zu) +
  **Endlagen-Feedback über DI**; Stellzeit über `emergencyMotorTravelSec`.

### A.5 Digitaleingänge (DI1–DI8) — Nutzung
GPIO4–GPIO11 (invertiert). Vorgesehene Verwendung, von der Firmware im `/api/status` gemeldet und vom Adapter
in Safety/Monitoring gespeist:
- **Ventil-Endlagen** (Motorkugelhahn auf/zu) · **Druckschalter** (harte Überdrucksicherung) · **Schwimmer-/
  Leckschalter** · **Pumpen-Lauf-Feedback** · **Handtaster** (lokaler Not-Aus/Override).

### A.6 Sensoren & lokale Autonomie
- **RS485 (Modbus RTU):** O₂-/Temperatur-/Drucksensoren können **direkt am Board** hängen; die Firmware liest sie
  und exponiert sie im `/api/status` → spart separate ioBroker-Adapter (Alternative zum M5-Fremd-States-Weg).
- **RTC PCF85063 + NVS/Flash:** autonome Zeit & Zeitplan-Fallback, damit die Firmware auch **ohne Netz** sicher
  weiterläuft (On-Device-Watchdog, Rundlauf, Notventil-Logik).
- **Summer (GPIO46):** akustischer Alarm bei Interlock-Trip · **RGB-LED (WS2812, GPIO38):** Statusfarbe
  (grün normal / gelb Modus / rot Interlock).

### A.7 Firmware ↔ Protokoll-Mapping (konkretisiert §4)
- `GET /api/info` → `{fw, protocol, relays:8, di:8, features:[ethernet,rs485,rtc]}`.
- `GET /api/status` → `{valves:[8×bool] (TCA9554), di:[8×bool] (GPIO4–11), pump, emergency, pressure/o2/temps (RS485), uptime}`.
- `POST /api/valve {index,open}` → TCA9554-Pin · `POST /api/emergency` · `POST /api/pump` · `WS /ws` (Status-Push + Heartbeat).
- **Firmware-Stack-Empfehlung:** Arduino-ESP32 oder ESP-IDF; W5500-Ethernet-Lib; TCA9554 über I²C; AsyncWebServer
  für HTTP+WS; WS2812/Buzzer für lokale Signalisierung. **Protokoll-versioniert** (`/api/info.protocol`), Adapter
  prüft Kompatibilität.
