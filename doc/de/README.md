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

> ⚠️ **Projektstatus: in Arbeit.** Das Konfigurationsmodell und das vollständige Datenpunkt-Modell
> stehen: Der Adapter validiert deine Konfiguration und erstellt (und bereinigt) entsprechend alle
> seine Objekte. Die Steuerungslogik, die Hardware-Backends und die Überwachungsfunktionen werden
> Meilenstein für Meilenstein ergänzt. Für den Produktiveinsatz ist die Version noch nicht gedacht.

---

## Inhaltsverzeichnis

1. [Was der Adapter macht](#1-was-der-adapter-macht)
2. [Sicherheitskonzept](#2-sicherheitskonzept)
3. [Voraussetzungen](#3-voraussetzungen)
4. [Installation](#4-installation)
5. [Konfigurationsübersicht](#5-konfigurationsübersicht)
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

Die Ventile und die Pumpe lassen sich entweder über **vorhandene ioBroker-States** (aus einem
beliebigen Adapter, der die Schalter bereitstellt) oder **direkt auf einem ESP32** mit der
zugehörigen Firmware ansteuern.

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
* Ein oder mehrere Ventile, erreichbar als ioBroker-States, oder ein ESP32 mit der zugehörigen
  Firmware.

## 4. Installation

Installiere den Adapter über den ioBroker-Admin (oder, während der Entwicklung, aus dem
GitHub-Repository) und lege eine Instanz an. Öffne die Instanz-Einstellungen, um ihn zu
konfigurieren.

## 5. Konfigurationsübersicht

Die Einstellungsseite wächst mit den Meilensteinen. Geplante Abschnitte: Allgemein/Backend,
Belüftungspunkte, Steuerung (Zeitplan/Round-Robin/Gruppen), Sensoren, Astro & Standort,
Feeder-Kopplung, Sicherheit und Benachrichtigungen. Die vollständige Planung findest du in
[PROJECT_PLAN.md](../../PROJECT_PLAN.md).

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

**Statistik**

| Objekt | Typ | Rolle | Beschreibung |
|--------|-----|-------|--------------|
| `statistics.compressorRuntimeTodayH` | number | `value` | Heutige Kompressorlaufzeit (Stunden) |
| `statistics.switchCyclesToday` | number | `value` | Heutige Ventilschaltzyklen |

Wird ein Punkt, eine Gruppe oder ein Sensor aus der Konfiguration entfernt, werden dessen Objekte
automatisch bereinigt.

## 7. Roadmap

Der vollständige, meilensteinbasierte Umsetzungsplan (Steuerungslogik, HAL-Backends, ESP32-Firmware,
Überwachung, Feeder-Kopplung, Wintermodus und der darauf folgende vis-2-Widget-Adapter) steht in
[PROJECT_PLAN.md](../../PROJECT_PLAN.md).

---

📖 [Hauptdokumentation (Englisch)](../../README.md)
