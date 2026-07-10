![Logo](../../admin/automatic-pond-aeration.png)
# ioBroker.automatic-pond-aeration

<p align="center">
  <a href="https://www.buymeacoffee.com/ssbingo"><img src="https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=&slug=ssbingo&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" /></a>
</p>

## automatic-pond-aeration Adapter für ioBroker

Dieser Adapter **steuert und überwacht eine Teichbelüftungsanlage**. Eine Luftpumpe/ein Kompressor
speist Luft über Ventile (Magnetventile) zu **bis zu 8 Belüftungspunkten** im Teich. Der Adapter
schaltet diese Ventile nach einem **Zeitplan**, im **zyklischen Rundlauf (Round-Robin)** oder über
ein **Gruppenprogramm** und schützt die Pumpe mit einer **Sicherheitsverriegelung**: Solange die
Pumpe läuft, bleibt immer mindestens ein Ventil geöffnet – andernfalls wird das **Notventil**
geöffnet und (falls die Pumpe als Datenpunkt verfügbar ist) die Pumpe abgeschaltet.

Optional kann er den **gelösten Sauerstoff**, die **Luft- und Wassertemperatur** sowie den **Druck**
überwachen, **astronomische Zeiten** aus deiner **Geoposition** berechnen, die Hardware **direkt auf
einem ESP32** ansteuern (ohne zusätzliche ioBroker-Instanz) und ausgewählte Belüftungspunkte während
der Fütterung pausieren, wenn
[ioBroker.automatic-feeder](https://github.com/ssbingo/ioBroker.automatic-feeder) installiert ist.

> 🛑 **WARNUNG — ENTWICKLUNGSSTAND, TIERWOHL (bitte lesen).**
> Dieser Adapter befindet sich **noch in aktiver Entwicklung und ist für den unbeaufsichtigten
> Betrieb noch NICHT verifiziert.** Er steuert ein **lebenserhaltendes System für lebende Tiere** –
> eine Fehlfunktion, Fehlkonfiguration oder ein Bug kann die Belüftung stoppen und **die Gesundheit
> und das Leben deiner Fische und des übrigen Teichlebens gefährden** (Sauerstoffmangel, kein
> eisfreies Loch im Winter, eine gegen geschlossene Ventile fördernde Pumpe). **Nutze ihn nicht
> ungeprüft:** Beobachte ihn vor jedem unbeaufsichtigten Betrieb **genau und überprüfe jede Funktion**
> auf deiner eigenen Hardware über einen aussagekräftigen Zeitraum und halte eine unabhängige,
> bewährte Belüftung/Ausfallsicherung bereit. **Nutzung auf eigene Gefahr.** *(Dieser Hinweis bleibt
> bestehen, bis er ausdrücklich widerrufen wird.)*

> ⚠️ **Projektstatus.** Vollständig implementiert und über den Admin konfigurierbar: die
> Ventilsteuerung (Zeitplan, zyklischer Round-Robin, Gruppen), die **Sicherheitsverriegelung** gegen
> Nullförderung, die **Überwachung** (Sauerstoff, Luft-/Wassertemperatur, Druck mit Alarmen),
> **astronomische Zeiten & Geoposition**, die **Feeder-Kopplung**, der **Winter-/Eisfrei-Modus**, der
> **Sauerstoff-Regelkreis**, **Benachrichtigungen über einen Messaging-Adapter**, die
> **Laufzeitstatistik**, ein **Trockenlauf-Testmodus**, **Übersteuerungstaster** pro Punkt sowie das
> direkte **ESP32**-Hardware-Backend (spricht über HTTP mit der Referenz-Firmware — flashe sie im
> Browser von der [Firmware-Flash-Seite](https://ssbingo.github.io/pond-aeration-flash/)). Das
> Standard-Backend steuert deine Ventile und Pumpe über vorhandene ioBroker-States, sodass jede
> Relaisplatine funktioniert.

> 📘 **Vollständige Schritt-für-Schritt-Anleitung (PDF, für Einsteiger – mit Schaltplänen, FAQ &
> Fehlerbehebung):** English → [../../docs/manual/pond-aeration-manual.en.pdf](../../docs/manual/pond-aeration-manual.en.pdf) ·
> Deutsch → [../../docs/manual/pond-aeration-manual.de.pdf](../../docs/manual/pond-aeration-manual.de.pdf)
> (Quelle & Build unter [../../docs/manual/](../../docs/manual/)).

---

## Inhaltsverzeichnis

1. [Was der Adapter macht](#1-was-der-adapter-macht)
2. [Sicherheitskonzept](#2-sicherheitskonzept)
3. [Voraussetzungen](#3-voraussetzungen)
4. [Installation](#4-installation)
5. [Konfiguration](#5-konfiguration)
6. [Objekte / Datenpunkte](#6-objekte--datenpunkte)
7. [Roadmap](#7-roadmap)

---

## 1. Was der Adapter macht

Eine Teichbelüftung verteilt Luft von einer einzigen Pumpe auf mehrere Ausströmer/Luftsteine. Welche
Punkte Luft erhalten, entscheiden **Magnetventile**. Dieser Adapter entscheidet, **wann** jedes
Ventil öffnet:

* **Zeitplan** – einen Punkt/eine Gruppe während konfigurierter Wochentags-Zeitfenster öffnen.
* **Zyklischer Rundlauf (Round-Robin)** – reihum durch die Punkte schalten, jeder für eine
  einstellbare Verweildauer geöffnet.
* **Gruppen** – mehrere Punkte gemeinsam steuern; es kann **nie mehr Gruppen als Punkte geben**.

Die Ventile und die Pumpe werden **entweder** über **vorhandene ioBroker-States** angesteuert (aus
einem beliebigen Adapter, der die Schalter bereitstellt) **oder direkt auf einem dedizierten
ESP32-Controller**, auf dem die Referenz-Firmware läuft – ohne zusätzliche ioBroker-Instanz. Du
wählst dies unter **Hardware-Backend** (Tab Allgemein); siehe [Konfiguration → Allgemein](#allgemein).

## 2. Sicherheitskonzept

Ein Luftkompressor darf **niemals gegen vollständig geschlossene Ventile arbeiten** (Nullförderung /
Dead-Heading) – das erzeugt Überdruck und kann die Pumpe beschädigen. Deshalb:

* Solange die Pumpe läuft, bleibt **immer mindestens ein Ventil geöffnet** (konfigurierbares
  Minimum).
* Lässt sich das nicht sicherstellen, wird das **Notventil geöffnet** und, falls die Pumpe steuerbar
  ist, die **Pumpe abgeschaltet**.
* Das Umschalten der Ventile erfolgt nach dem Prinzip **make-before-break** (das nächste Ventil
  öffnet, bevor das vorherige schließt), sodass es nie einen Moment mit allen Ventilen geschlossen
  gibt.

> 💡 **Verdrahtungsempfehlung:** ein **stromlos offenes (NO)** Notventil verwenden, damit es bei
> Stromausfall öffnet (fail-safe). Läuft die Hardware auf einem ESP32, läuft dieselbe Verriegelung
> auch lokal auf dem Gerät, sodass ein Netzwerk- oder ioBroker-Ausfall die Pumpe nicht beschädigen
> kann.

## 3. Voraussetzungen

* Node.js ≥ 22
* js-controller ≥ 6.0.11, admin ≥ 7.6.20
* Ein oder mehrere Ventile, erreichbar als ioBroker-States (z. B. ein Relais-/Steckdosen-Adapter).

## 4. Installation

Installiere den Adapter über den ioBroker-Admin (oder, während der Entwicklung, aus dem
GitHub-Repository) und lege eine Instanz an. Öffne die Instanz-Einstellungen, um ihn zu
konfigurieren.

## 5. Konfiguration

Die Einstellungsseite ist in Registerkarten (Tabs) gegliedert. Du musst nicht alles ausfüllen – nur
die Teile, die du tatsächlich nutzt.

### Allgemein
- **Hauptfreigabe** – der Ein/Aus-Schalter für den gesamten Adapter. Ist er aus, wird nichts
  gesteuert.
- **Trockenlauf (nur protokollieren, keine Hardware schalten)** – die gesamte Steuerlogik läuft und
  die Datenpunkte werden aktualisiert, aber Ventil-/Pumpenbefehle werden nur ins Log geschrieben
  (`[DRY-RUN] would …`) statt in die echten States. Ideal für die Inbetriebnahme und zum Testen einer
  Konfiguration, bevor sie verdrahtet wird.
- **Hardware-Backend** – `Vorhandene ioBroker-States` (Standard) steuert deine Ventile/Pumpe über
  States anderer Adapter. `ESP32 (direkt)` spricht über HTTP mit der Referenz-Firmware auf einem
  Waveshare ESP32-S3-POE-ETH-8DI-8RO. Flashe die Firmware im Browser von der
  [Firmware-Flash-Seite](https://ssbingo.github.io/pond-aeration-flash/) (Chrome/Edge, keine
  Zusatzsoftware), lege dann die **Host/IP** fest und ordne das **Notventil-Relais** und das
  **Pumpen-Relais** (0–7) zu; die Belüftungspunkte nutzen den pro Punkt eingestellten Relaiskanal. Der
  Adapter überträgt eine Sicherheitskonfiguration und einen Heartbeat, damit die geräteinterne
  Ausfallsicherung der Firmware den Teich schützt, selbst wenn ioBroker ausfällt.
  - **Autonome Zeitpläne (ohne ioBroker laufen)** *(nur ESP32, optional)* – wenn aktiviert,
    überträgt der Adapter auch deine Zeitpläne an das Gerät; fällt die Verbindung aus, führt der
    ESP32 sie anhand seiner NTP-Uhr selbst weiter aus (die Dead-Head-Sicherheitsverriegelung gilt
    weiterhin). Die zyklische Sequenz bleibt beim Adapter.
  - **Firmware-Kompatibilität** – Adapter und Firmware werden über eine **Protokoll-Version** (der
    harte Vertrag) abgeglichen, nicht über exakte Release-Nummern. Diese Adapter-Version spricht
    **Protokoll 1** und **empfiehlt Firmware v1.2.2** (mindestens v1.0.0); der Admin zeigt dies an und
    verlinkt auf die Releases. Beim Verbinden werden die Version des Geräts und ein
    Kompatibilitäts-Flag als `info.deviceFirmware` und `info.firmwareCompatible` veröffentlicht, und
    jede Protokoll-Abweichung wird ins Log geschrieben. Siehe die Kompatibilitätstabelle im
    [Handbuch](../../docs/manual/pond-aeration-manual.de.pdf) / Firmware-Repo.
  - **Lizenzierung** *(nur wenn deine Firmware das optionale Lizenz-Overlay mitbringt)* – das Gerät
    läuft in einer Stufe: **free** (nur Überwachung), **community** (Relaissteuerung) oder **pro**
    (+ der autonome Standalone-Zeitplan); die Sicherheit (Ausfallsicherung, Notventil,
    Dead-Head-Verriegelung, Handtaster) ist unabhängig davon immer aktiv. Ein neues Gerät läuft für
    einen Testzeitraum voll (**pro**) und fällt danach auf free zurück, bis auf der
    `/license`-Seite des Geräts ein Aktivierungsschlüssel eingegeben wird. Der Adapter zeigt den
    Status unter `info.licenseTier` / `info.licenseTrialDaysLeft` / `info.deviceCode`; ist das Gerät
    **nicht für die Steuerung lizenziert**, läuft die Überwachung weiter und die Steuerung wird
    übersprungen (siehe `info.licenseControlBlocked`). Öffentliche Firmware ohne das Overlay ist
    nicht betroffen.
    *Hinweis zum Neu-Flashen:* Der Aktivierungsschlüssel wird auf dem ESP gespeichert und **beim
    erneuten Flashen über den Browser-Installer gelöscht** (es startet ein frischer Testzeitraum).
    Der **Gerätecode ist hardwarebasiert und ändert sich nie**, sodass **einfach derselbe
    Aktivierungsschlüssel erneut eingegeben** werden kann – ein neuer Schlüssel ist nicht nötig. Ein
    Firmware-**Update über die Update-Seite des Geräts** (Ein-Klick-Online-Update oder Datei-Upload)
    behält die Aktivierung und alle Einstellungen; nur der Installer setzt sie zurück.
  - **Sensor-Spiegelung** – bei jeder Abfrage überträgt der Adapter zusätzlich deine konfigurierten
    Sensor-Datenpunkte (Sauerstoff, Wasser-/Lufttemperatur, Druck) an das Gerät, sodass sie auf der
    **eigenen Web-UI des ESP** erscheinen (mit *(ioBroker)* gekennzeichnet) – selbst bei Sensoren, die
    nur ioBroker-States sind und nicht am ESP verdrahtet sind. Ein physisch am ESP verdrahteter Sensor
    behält Vorrang; übertragene Werte verfallen nach einigen Minuten. Benötigt Firmware ≥ 1.1.7.
- **Abfrageintervall (s)** – wie oft der Backend-Status abgefragt wird (z. B. `30`).

### Belüftungspunkte
Das Herzstück der Konfiguration. Füge **bis zu 8** Punkte hinzu; jeder Punkt ist ein Ventil. Pro
Punkt:
- **Name** – z. B. `Pier`, `Deep zone`. Beim **ESP32**-Backend wird dieser Name auch **auf der
  eigenen Web-UI des Geräts angezeigt** (auf dem Relaiskanal des Punkts) — eine **lizenzpflichtige
  Funktion** (ab Stufe **community**). `Ch 7 = Notventil` und `Ch 8 = Pumpe` sind feste
  Bezeichnungen. Siehe [Namen auf der ESP32-Web-UI](#namen-auf-der-esp32-web-ui).
- **Aktiviert** – diesen Punkt in die Steuerung einbeziehen.
- **Backend** – `ioBroker` (ein fremder State) oder `ESP32` (ein Relaiskanal auf dem Gerät). Die
  Option `ESP32` erscheint nur, wenn das **Hardware-Backend** (Tab Allgemein) auf `ESP32 (direkt)`
  steht.
- **Ventil-State / Kanal** – für das ioBroker-Backend den Schalter-State wählen, der das Ventil
  öffnet (über den Objektbrowser). Für das ESP32-Backend den **Relaiskanal** aus einem Dropdown
  wählen: die Kanäle, die die **Pumpe** und das **Notventil** ansteuern, werden als *reserviert*
  angezeigt und bereits von einem anderen Punkt belegte Kanäle als *belegt*, sodass du nur einen
  freien wählen kannst. Wenn kein Kanal mehr frei ist, füge weitere Punkte über die Spalte Backend
  als **ioBroker-States** hinzu.
- **Übersteuerungstaster** *(optional)* – ein physischer Taster pro Punkt (z. B. ein digitaler
  ESP32-Eingang oder ein beliebiger boolescher State). Er wirkt als **Umschalter (Toggle)**: ein
  Druck erzwingt den Punkt **ein, mit Vorrang vor der automatischen Steuerung**
  (Zeitplan/Sequenz/Winter/Sauerstoff) und sogar vor einer Feeder-Pause — *nur der Hauptschalter oder
  eine Sicherheitsauslösung setzt ihn außer Kraft*. Zum Freigeben erneut drücken. (Weitere
  Tastermodi sind geplant; das Feld ist dafür vorbereitet.) Ein Taster ist nur für ein
  **Belüftungsventil** verfügbar — eine Stelle, die auf dem ESP32-Relaiskanal der **Pumpe** oder des
  **Notventils** liegt, kann keinen haben (die Option ist ausgegraut). Beim ESP32-Backend wird ein
  **am Gerät** gedrückter Taster in ioBroker zurückgespiegelt (`aeration.point.<n>.buttonOn`) und
  erhält dieselbe Priorität.
- **Tastername** *(ESP32-Backend, optional)* – ein sprechender Name für den Übersteuerungstaster
  dieses Punkts, der auf der Web-UI des Geräts angezeigt wird (siehe unten). Leer → der Taster zeigt
  den Punktnamen.

#### Namen auf der ESP32-Web-UI

*(ESP32-Backend, **lizenzpflichtige Funktion** — ab Stufe **community** verfügbar.)* Gib deinen
Kanälen und Tastern sprechende Namen, die auf den eigenen Web-Seiten des Geräts anstelle von
`Ch 1…8` / `DI 1…8` erscheinen:

- Der Adapter **überträgt den Namen jedes Belüftungspunkts** an dessen Relaiskanal (Ch 1–6) und den
  optionalen **Tasternamen** jedes Punkts an den zugehörigen digitalen Eingang (DI 1–8).
- **Ch 7 = Notventil** und **Ch 8 = Pumpe** sind **fest** und können nicht umbenannt werden.
- **Standalone (ohne Adapter):** dieselben Namen lassen sich **am Gerät** unter *Einstellungen → Namen
  (Kanäle & Taster)* bearbeiten und werden auf dem ESP (NVS) gespeichert; ist der Adapter verbunden,
  überschreibt er sie mit den hier konfigurierten Namen.
- Auf **free**-Firmware (ohne Lizenz) werden die Namen ignoriert und die Seiten zeigen die
  Standard-Bezeichnungen `Ch`/`DI`.

### Gruppen
Punkte zu Gruppen zusammenfassen, um sie gemeinsam zu schalten (z. B. öffnet eine Schaltfläche
mehrere Ausströmer). Gib der Gruppe einen Namen und hake ihre Mitgliedspunkte an. **Es kann nie mehr
Gruppen als Punkte geben.**

### Steuerung
- **Zyklischer Round-Robin** – reihum durch die Punkte schalten, jeder für die **Verweildauer**
  (Sekunden) geöffnet.
  - **Sequenz (Punkte und Gruppen)** – optional einen **geordneten Ablauf von Schritten** definieren,
    wobei jeder Schritt einen einzelnen **Punkt oder eine ganze Gruppe** anspricht und eine eigene
    Verweildauer haben kann. So lässt sich z. B. *Gruppe 1 → Gruppe 3 → Punkt 1 → …* fahren und Punkte
    und Gruppen frei **mischen**. Die Schritte lassen sich im Admin mit den Pfeilen nach oben/unten
    umsortieren. Lasse die Sequenz leer, um auf den einfachen Round-Robin über alle Punkte
    zurückzufallen.
- **Zeitpläne** – ausgewählte Punkte/Gruppen während eines Wochentags-Zeitfensters öffnen. **Von**/**Bis**
  werden über eine **Uhr-Auswahl** gewählt (Stunde/Minute, 24 h; über Nacht reichende Fenster wie
  `22:00`–`06:00` werden unterstützt). Ein aktiver Zeitplan hat **Vorrang vor dem Round-Robin / der Sequenz**.
- **Winter-/Eisfrei-Modus** – während der konfigurierten Saison (**Start**/**Ende** über einen
  **Kalender** gewählt — nur **Tag und Monat** zählen, jährlich wiederkehrend, z. B. 1. Nov. – 15. März,
  über den Jahreswechsel hinweg) werden die
  ausgewählten Punkte zwangsweise eingeschaltet, um ein eisfreies Loch offen zu halten. Optional **Nur
  wenn es kalt ist (Frostschutz)** anhaken und einen **Lufttemperatur-Schwellenwert** setzen, damit
  der Teich nur belüftet wird, solange es tatsächlich friert (dazu wird die Lufttemperatur-Überwachung
  benötigt). Lasse **Offen gehaltene Punkte** leer, um den ganzen Teich zu belüften. Der Winter-Modus
  läuft im Betriebsmodus `auto` und weicht wie jedes Programm weiterhin der Sicherheitsverriegelung
  und einer Feeder-Pause.

### Sensoren
Optionale Überwachung. Für jeden Sensor **Aktiviert** anhaken und den **Quell-State** wählen:
- **Gelöster Sauerstoff** – mit einem unteren Schwellenwert (löst `sensors.oxygenAlarm` aus), einem
  Zielwert und einer Hysterese; die **Sauerstoffsättigung %** wird aus der Wassertemperatur berechnet.
  - **Sauerstoff-Regelkreis** – ist er aktiviert, **schaltet der Adapter die Belüftung zwangsweise
    ein**, solange der Sauerstoff unter dem unteren Schwellenwert liegt, und hält sie ein, bis er sich
    auf den Zielwert erholt hat (oder auf `low + hysteresis`, wenn kein Zielwert gesetzt ist). Lasse
    **Verstärkte Punkte** leer, um den ganzen Teich zu verstärken. Wie der Winter-Modus läuft der
    Regelkreis im Modus `auto` und weicht der Sicherheitsverriegelung und Feeder-Pausen.
- **Luft-/Wassertemperatur**.
- **Druck** – mit Min/Max (außerhalb des Bereichs löst `sensors.pressureAlarm` aus).

### Standort
Wird für die astronomischen Zeiten benötigt (Sonnenaufgang/Sonnenuntergang/Nacht).
- **Standortquelle** – `ioBroker-Systemstandort` (nutzt deine Systemkoordinaten) oder `Eigener
  Standort`. Für einen eigenen Standort eine Adresse eingeben und **Suchen** drücken (bei Bedarf über
  OpenStreetMap/Nominatim geokodiert) oder den Marker auf der Karte anklicken/ziehen.

### Feeder
Ausgewählte Punkte pausieren, während
[ioBroker.automatic-feeder](https://github.com/ssbingo/ioBroker.automatic-feeder) füttert, damit das
Futter nicht verwirbelt wird.
- Die **Feeder-Instanz** wählen (automatisch erkannt) und die zu überwachenden **Feeder-Schalter**
  anhaken.
- **Dauermodus** – `Messen` überwacht den Schalter (Pause = Fütterung + Offset, ohne die Fütterdauer
  vorab zu kennen); `Puls` nutzt eine feste Fütterdauer.
- **Offset (s)** – zusätzliche Pause nach Fütterungsende. **Er sollte mindestens der
  durchschnittlichen Fresszeit der Tiere entsprechen** (Beispiel: 15 s Fütterung + 60 s Offset ⇒ 75 s
  pausierte Belüftung).
- **Betroffene Punkte** – welche Punkte während der Fütterung pausieren.

### Sicherheit
Jedes Feld auf diesem Tab trägt eine **In-Admin-Erklärung**, was es bewirkt und welche Auswirkung es
hat — lies sie, denn dies ist der Tab, auf dem ein falscher Wert am meisten zählt.
- **Min. offene Ventile bei laufender Pumpe** – der Schutz gegen Nullförderung (Standard `1`).
- **Watchdog-Intervall (s)** und **Make-before-break-Überlappung (s)**.
- **Pumpe** – ob sie **steuerbar** ist, das Pumpen-**Signal** sowie Mindest-Ein-/Ausschaltzeiten
  gegen zu häufiges Takten. Ist sie steuerbar, **steuert der Adapter die Pumpe so, dass sie der
  Belüftungsanforderung folgt** — sie läuft, solange mindestens die minimale Anzahl Ventile geöffnet
  ist, und schaltet ab, wenn der Teich im Leerlauf ist oder eine Nullförderungs-Auslösung eintritt
  (unter Einhaltung der Mindest-Ein-/Ausschaltzeiten); ist sie *nicht* steuerbar, wird die Pumpe nur
  beobachtet und allein das Notventil schützt sie. *Beim **ESP32**-Backend ist das
  Pumpen-Signal der **ESP32-Relaiskanal** — genau derselbe, der unter Allgemein → Hardware-Backend
  gesetzt ist, hier angezeigt, damit die beiden Tabs sich nie widersprechen können; beim
  **ioBroker**-Backend ist es ein ioBroker-State.*
- **Notventil** – sein **Signal**, ob es **stromlos offen** ist (fail-safe), der Ventil**typ**
  (Magnetventil oder motorisierter Kugelhahn) und, bei einem Motorventil, seine **Laufzeit**. *Beim
  ESP32-Backend ist das Signal ebenso der ESP32-Notventil-Relaiskanal (wie bei Allgemein).*

### Benachrichtigungen
Benachrichtigungen aktivieren und eine **Messaging-Instanz** wählen (ein beliebiger Adapter vom Typ
`messaging`, z. B. Telegram oder Pushover), dann **ankreuzen, welche Ereignisse** eine Nachricht
senden sollen:
- **Sicherheitsverriegelung** – wenn die Nullförderungs-Verriegelung auslöst oder wieder freigibt;
- **Sauerstoffalarm** – wenn der gelöste Sauerstoff zu tief fällt oder sich erholt;
- **Druckalarm** – wenn der Druck seinen Bereich verlässt oder wieder erreicht.

Bei jeder Flanke (Auslösen und Freigabe) wird ein kurzer, lokalisierter Text gesendet. Ist kein
Ereignis angehakt, wird nichts gesendet.

## 6. Objekte / Datenpunkte

Der Adapter erstellt seine Datenpunkte aus deiner Konfiguration. Platzhalter: `<n>` = Index des
Belüftungspunkts (0–7), `<g>` = Gruppenindex. Mit **(w)** markierte Objekte sind beschreibbare
Befehle; alle anderen sind schreibgeschützte Statuswerte, die der Adapter aktualisiert.

**Allgemein**

| Objekt | Typ | Rolle | Beschreibung |
|--------|-----|-------|--------------|
| `info.connection` | boolean | `indicator.connected` | Adapter läuft / Konfiguration gültig |
| `info.backend` | string | `text` | Aktives Hardware-Backend (`iobroker` oder `esp32`) |
| `info.activeMode` | string | `text` | Aktueller Betriebsmodus |
| `info.dryRun` | boolean | `indicator` | Trockenlauf aktiv (es wird keine Hardware geschaltet) |

**ESP32-Backend (info)** (nur mit dem ESP32-Hardware-Backend)

| Objekt | Typ | Rolle | Beschreibung |
|--------|-----|-------|--------------|
| `info.deviceFirmware` | string | `text` | Vom ESP32 gemeldete Firmware-Version |
| `info.firmwareCompatible` | boolean | `indicator` | Firmware-Protokoll ist mit diesem Adapter kompatibel |
| `info.licenseTier` | string | `text` | Aktive Lizenzstufe: `free` (Überwachung), `community` (Relaissteuerung) oder `pro` (+ autonomer Zeitplan); leer, wenn die Firmware keine Lizenzsteuerung hat |
| `info.licenseTrialDaysLeft` | number | `value` | Verbleibende Testtage der Lizenz (0 = kein Test aktiv) |
| `info.deviceCode` | string | `text` | Gerätecode — beim Freischalten angeben, um einen Aktivierungsschlüssel zu erhalten |
| `info.licenseControlBlocked` | boolean | `indicator` | Das Gerät hat einen Steuerbefehl abgelehnt (nicht für die Steuerung lizenziert) |

**Steuerung (beschreibbare Befehle)**

| Objekt | Typ | Rolle | Beschreibung |
|--------|-----|-------|--------------|
| `control.enabled` | boolean (w) | `switch.enable` | Hauptfreigabe |
| `control.mode` | string (w) | `text` | Betriebsmodus: `auto`, `manual` oder `off` |
| `control.allOff` | boolean (w) | `button` | Alle Ventile schließen |
| `control.point.<n>.open` | boolean (w) | `switch` | Ventil von Punkt `<n>` manuell öffnen |
| `control.group.<g>.active` | boolean (w) | `switch` | Gruppe `<g>` manuell aktivieren |

**Belüftungspunkte** (ein Kanal pro konfiguriertem Punkt, benannt nach dem Punkt)

| Objekt | Typ | Rolle | Beschreibung |
|--------|-----|-------|--------------|
| `aeration.point.<n>.valveState` | boolean | `indicator` | Ventil ist geöffnet |
| `aeration.point.<n>.active` | boolean | `indicator` | Punkt belüftet gerade |
| `aeration.point.<n>.buttonOn` | boolean | `indicator` | Manueller Übersteuerungstaster aktiv (nur mit konfiguriertem Taster) |
| `aeration.point.<n>.runtimeTodaySec` | number | `value` | Heutige Laufzeit (Sekunden) |
| `aeration.point.<n>.runtimeTotalH` | number | `value` | Gesamtlaufzeit (Stunden, für Wartung) |
| `aeration.point.<n>.lastChange` | number | `value.time` | Zeitstempel der letzten Ventiländerung |
| `aeration.point.<n>.error` | string | `text` | Letzter Fehler für diesen Punkt |

**Gruppen**

| Objekt | Typ | Rolle | Beschreibung |
|--------|-----|-------|--------------|
| `groups.<g>.members` | string | `json` | Indizes der Mitgliedspunkte |
| `groups.<g>.active` | boolean | `indicator` | Gruppe ist gerade aktiv |

**Sicherheit**

| Objekt | Typ | Rolle | Beschreibung |
|--------|-----|-------|--------------|
| `safety.interlockActive` | boolean | `indicator.alarm` | Sicherheitsverriegelung derzeit aktiv |
| `safety.emergencyValve` | boolean | `indicator` | Notventil ist geöffnet |
| `safety.pumpRunning` | boolean | `indicator` | Pumpe läuft |
| `safety.openValveCount` | number | `value` | Anzahl offener Ventile |
| `safety.lastTripReason` | string | `text` | Grund der letzten Auslösung der Verriegelung |

**Sensoren** (nur angelegt, wenn die entsprechende Überwachung aktiviert ist)

| Objekt | Typ | Rolle | Beschreibung |
|--------|-----|-------|--------------|
| `sensors.oxygen` | number | `value` | Gelöster Sauerstoff (mg/l) |
| `sensors.oxygenSaturation` | number | `value` | Sauerstoffsättigung (%) |
| `sensors.oxygenAlarm` | boolean | `indicator.alarm` | Sauerstoff unter dem unteren Schwellenwert |
| `sensors.oxygenBoostActive` | boolean | `indicator` | Sauerstoff-Regelkreis erzwingt die Belüftung (nur bei aktiviertem Regelkreis) |
| `sensors.airTemperature` | number | `value.temperature` | Lufttemperatur (°C) |
| `sensors.waterTemperature` | number | `value.temperature` | Wassertemperatur (°C) |
| `sensors.pressure` | number | `value.pressure` | Systemdruck (bar) |
| `sensors.pressureAlarm` | boolean | `indicator.alarm` | Druck außerhalb des Bereichs |

**Astronomie & Standort**

| Objekt | Typ | Rolle | Beschreibung |
|--------|-----|-------|--------------|
| `astro.sunrise` / `astro.sunset` / `astro.solarNoon` | string | `text` | Sonnenzeiten für den Standort |
| `astro.isNight` | boolean | `indicator` | Es ist gerade Nacht |
| `location.latitude` / `location.longitude` | number | `value.gps.*` | Ermittelte Koordinaten |
| `location.resolvedAddress` | string | `text` | Ermittelte Adresse |

**Feeder-Kopplung** (nur angelegt, wenn die Feeder-Kopplung aktiviert ist)

| Objekt | Typ | Rolle | Beschreibung |
|--------|-----|-------|--------------|
| `feeder.pauseActive` | boolean | `indicator` | Belüftung für die Fütterung pausiert |
| `feeder.pauseUntil` | number | `value.time` | Pause aktiv bis |
| `feeder.lastFeedStart` | number | `value.time` | Letzter Fütterungsbeginn |

**Winter-/Eisfrei-Modus** (nur angelegt, wenn der Winter-Modus aktiviert ist)

| Objekt | Typ | Rolle | Beschreibung |
|--------|-----|-------|--------------|
| `winter.active` | boolean | `indicator` | Winter-Modus erzwingt derzeit die Belüftung |
| `winter.frostActive` | boolean | `indicator` | Frostschutz ist aktiv (kalt genug) |

**Statistik**

| Objekt | Typ | Rolle | Beschreibung |
|--------|-----|-------|--------------|
| `aeration.point.<n>.runtimeTodaySec` | number | `value` | Heutige Laufzeit von Punkt `<n>` (Sekunden) |
| `aeration.point.<n>.runtimeTotalH` | number | `value` | Gesamtlaufzeit von Punkt `<n>` (Stunden) |
| `statistics.compressorRuntimeTodayH` | number | `value` | Heutige Kompressorlaufzeit (Stunden) |
| `statistics.switchCyclesToday` | number | `value` | Heutige Ventilschaltzyklen |

Wird ein Punkt, eine Gruppe oder ein Sensor aus der Konfiguration entfernt, werden dessen Objekte
automatisch bereinigt.

## 7. Roadmap

Fertig: Konfigurations-UI, Ventilsteuerung (Zeitplan/Round-Robin/Gruppen), die
Sicherheitsverriegelung gegen Nullförderung, Überwachung, Astro & Geoposition, die Feeder-Kopplung,
der **Winter-/Eisfrei-Modus**, der **Sauerstoff-Regelkreis**, **Benachrichtigungen**, die
**Laufzeitstatistik**, der **Trockenlauf-Testmodus** und das direkte **ESP32**-Hardware-Backend mit
seiner Referenz-Firmware (die du im Browser von der
[Firmware-Flash-Seite](https://ssbingo.github.io/pond-aeration-flash/) flashst). **Noch ausstehend:**

* ein nachgelagerter **vis-2-Widget-Adapter** für Bedienung und Überwachung.

Den vollständigen, meilensteinbasierten Plan findest du in [PROJECT_PLAN.md](../../PROJECT_PLAN.md).

---

📖 [Hauptdokumentation (Englisch)](../../README.md)
