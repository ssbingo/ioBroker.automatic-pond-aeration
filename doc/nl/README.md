![Logo](../../admin/automatic-pond-aeration.png)
# ioBroker.automatic-pond-aeration

<p align="center">
  <a href="https://www.buymeacoffee.com/ssbingo"><img src="https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=&slug=ssbingo&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" /></a>
</p>

## automatic-pond-aeration-adapter voor ioBroker

Deze adapter **bestuurt en bewaakt een vijverbeluchtingssysteem**. Een luchtpomp/compressor voert
lucht via kleppen (magneetkleppen) naar **maximaal 8 beluchtingspunten** in de vijver. De adapter
schakelt die kleppen volgens een **tijdschema**, een **cyclische roundrobin** of een
**groepsprogramma**, en beschermt de pomp met een **veiligheidsvergrendeling**: zolang de pomp
draait, blijft er altijd minstens één klep geopend – anders wordt de **noodklep** geopend en (als de
pomp als datapunt beschikbaar is) de pomp uitgeschakeld.

Optioneel kan hij **opgeloste zuurstof**, de **lucht- en watertemperatuur** en de **druk** bewaken,
**astronomische tijden** berekenen uit je **geolocatie**, de hardware **rechtstreeks op een ESP32**
aansturen (zonder extra ioBroker-instantie) en geselecteerde beluchtingspunten pauzeren tijdens het
voeren wanneer [ioBroker.automatic-feeder](https://github.com/ssbingo/ioBroker.automatic-feeder) is
geïnstalleerd.

> ⚠️ **Projectstatus: vroeg raamwerk / werk in uitvoering.** Deze versie legt het adapterskelet aan
> (levenscyclus, basisobjecten, configuratiemodel en de basis van de veiligheidsvergrendeling). De
> besturingslogica, de hardware-backends en de bewakingsfuncties worden mijlpaal voor mijlpaal
> toegevoegd. Voor productiegebruik is deze versie nog niet bedoeld.

---

## Inhoudsopgave

1. [Wat de adapter doet](#1-wat-de-adapter-doet)
2. [Veiligheidsconcept](#2-veiligheidsconcept)
3. [Vereisten](#3-vereisten)
4. [Installatie](#4-installatie)
5. [Configuratieoverzicht](#5-configuratieoverzicht)
6. [Objecten / datapunten](#6-objecten--datapunten)
7. [Roadmap](#7-roadmap)

---

## 1. Wat de adapter doet

Een vijverbeluchting verdeelt lucht van één enkele pomp over meerdere uitstromers/luchtstenen. Welke
punten lucht krijgen, wordt bepaald door **magneetkleppen**. Deze adapter bepaalt **wanneer** elke
klep opent:

* **Tijdschema** – een punt/groep openen tijdens ingestelde tijdvensters per weekdag.
* **Cyclische roundrobin** – om de beurt door de punten schakelen, elk geopend gedurende een
  instelbare verblijftijd.
* **Groepen** – meerdere punten samen aansturen; er kunnen **nooit meer groepen dan punten** zijn.

De kleppen en de pomp kunnen worden aangestuurd via **bestaande ioBroker-states** (van elke adapter
die de schakelaars beschikbaar stelt) of **rechtstreeks op een ESP32** met de bijbehorende firmware.

## 2. Veiligheidsconcept

Een luchtcompressor mag **nooit tegen volledig gesloten kleppen draaien** (dead-heading) – dit
veroorzaakt overdruk en kan de pomp beschadigen. Daarom:

* Zolang de pomp draait, blijft er **altijd minstens één klep geopend** (instelbaar minimum).
* Als dat niet kan worden gegarandeerd, wordt de **noodklep geopend** en, als de pomp bestuurbaar is,
  de **pomp uitgeschakeld**.
* Het schakelen van de kleppen gebeurt volgens **make-before-break** (de volgende klep opent voordat
  de vorige sluit), zodat er nooit een moment is waarop alle kleppen gesloten zijn.

> 💡 **Bedradingsaanbeveling:** gebruik een **normaal open (NO)** noodklep, zodat deze opent bij
> stroomuitval (fail-safe). Wanneer de hardware op een ESP32 draait, loopt dezelfde vergrendeling ook
> lokaal op het apparaat, zodat een netwerk- of ioBroker-storing de pomp niet kan beschadigen.

## 3. Vereisten

* Node.js ≥ 22
* js-controller ≥ 6.0.11, admin ≥ 7.6.20
* Eén of meer kleppen die als ioBroker-states bereikbaar zijn, of een ESP32 met de bijbehorende
  firmware.

## 4. Installatie

Installeer de adapter via de ioBroker-admin (of, tijdens de ontwikkeling, vanuit de
GitHub-repository) en maak een instantie aan. Open de instantie-instellingen om hem te configureren.

## 5. Configuratieoverzicht

De instellingenpagina groeit mee met de mijlpalen. Geplande secties: algemeen/backend,
beluchtingspunten, besturing (tijdschema/roundrobin/groepen), sensoren, astro & locatie,
feeder-koppeling, veiligheid en meldingen. Zie [PROJECT_PLAN.md](../../PROJECT_PLAN.md) voor het
volledige ontwerp.

## 6. Objecten / datapunten

| Object | Type | Rol | Beschrijving |
|--------|------|-----|--------------|
| `info.connection` | boolean | `indicator.connected` | Adapter draait / configuratie geldig |
| `control.enabled` | boolean (beschrijfbaar) | `switch.enable` | Hoofdvrijgave (commando) |
| `safety.interlockActive` | boolean | `indicator.alarm` | Veiligheidsvergrendeling momenteel actief |

Meer datapunten (per beluchtingspunt, groepen, sensoren, veiligheid en statistieken) worden
toegevoegd naarmate de bijbehorende functies worden geïmplementeerd; elke nieuwe state wordt hier
gedocumenteerd.

## 7. Roadmap

Zie [PROJECT_PLAN.md](../../PROJECT_PLAN.md) voor het volledige, op mijlpalen gebaseerde
implementatieplan (besturingslogica, HAL-backends, ESP32-firmware, bewaking, feeder-koppeling,
wintermodus en de daaropvolgende vis-2-widget-adapter).

---

📖 [Hoofddocumentatie (Engels)](../../README.md)
