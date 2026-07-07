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

> ⚠️ **Projektstatus: frühes Grundgerüst / in Arbeit.** Diese Version legt das Adapter-Gerüst an
> (Lebenszyklus, Basisobjekte, Konfigurationsmodell und die Grundlage der Sicherheitsverriegelung).
> Die Steuerungslogik, die Hardware-Backends und die Überwachungsfunktionen werden Meilenstein für
> Meilenstein ergänzt. Für den Produktiveinsatz ist die Version noch nicht gedacht.

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

| Objekt | Typ | Rolle | Beschreibung |
|--------|-----|-------|--------------|
| `info.connection` | boolean | `indicator.connected` | Adapter läuft / Konfiguration gültig |
| `control.enabled` | boolean (beschreibbar) | `switch.enable` | Hauptfreigabe (Befehl) |
| `safety.interlockActive` | boolean | `indicator.alarm` | Sicherheitsverriegelung derzeit aktiv |

Weitere Datenpunkte (pro Belüftungspunkt, Gruppen, Sensoren, Sicherheit und Statistik) kommen hinzu,
sobald die entsprechenden Funktionen umgesetzt werden; jeder neue State wird hier dokumentiert.

## 7. Roadmap

Der vollständige, meilensteinbasierte Umsetzungsplan (Steuerungslogik, HAL-Backends, ESP32-Firmware,
Überwachung, Feeder-Kopplung, Wintermodus und der darauf folgende vis-2-Widget-Adapter) steht in
[PROJECT_PLAN.md](../../PROJECT_PLAN.md).

---

📖 [Hauptdokumentation (Englisch)](../../README.md)
