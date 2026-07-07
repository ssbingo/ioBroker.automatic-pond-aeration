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

> ⚠️ **Projectstatus: werk in uitvoering.** Het configuratiemodel en het volledige datapuntmodel
> zijn aanwezig: de adapter valideert je configuratie en maakt al zijn objecten dienovereenkomstig
> aan (en ruimt ze op). De besturingslogica, de hardware-backends en de bewakingsfuncties worden
> mijlpaal voor mijlpaal toegevoegd. Voor productiegebruik is deze versie nog niet bedoeld.

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

De adapter maakt zijn datapunten aan op basis van je configuratie. Plaatshouders: `<n>` = index van
het beluchtingspunt (0–7), `<g>` = groepsindex. Objecten gemarkeerd met **(w)** zijn beschrijfbare
commando's; alle andere zijn alleen-lezen statuswaarden die door de adapter worden bijgewerkt.

**Algemeen**

| Object | Type | Rol | Beschrijving |
|--------|------|-----|--------------|
| `info.connection` | boolean | `indicator.connected` | Adapter draait / configuratie geldig |
| `info.backend` | string | `text` | Actieve hardware-backend (`iobroker` of `esp32`) |
| `info.activeMode` | string | `text` | Huidige bedrijfsmodus |

**Besturing (beschrijfbare commando's)**

| Object | Type | Rol | Beschrijving |
|--------|------|-----|--------------|
| `control.enabled` | boolean (w) | `switch.enable` | Hoofdvrijgave |
| `control.mode` | string (w) | `text` | Bedrijfsmodus: `auto`, `manual` of `off` |
| `control.allOff` | boolean (w) | `button` | Alle kleppen sluiten |
| `control.point.<n>.open` | boolean (w) | `switch` | De klep van punt `<n>` handmatig openen |
| `control.group.<g>.active` | boolean (w) | `switch` | Groep `<g>` handmatig activeren |

**Beluchtingspunten** (één kanaal per geconfigureerd punt, genoemd naar het punt)

| Object | Type | Rol | Beschrijving |
|--------|------|-----|--------------|
| `aeration.point.<n>.valveState` | boolean | `indicator` | Klep is geopend |
| `aeration.point.<n>.active` | boolean | `indicator` | Punt belucht momenteel |
| `aeration.point.<n>.runtimeTodaySec` | number | `value` | Looptijd vandaag (seconden) |
| `aeration.point.<n>.runtimeTotalH` | number | `value` | Totale looptijd (uren, voor onderhoud) |
| `aeration.point.<n>.lastChange` | number | `value.time` | Tijdstip van de laatste klepwijziging |
| `aeration.point.<n>.error` | string | `text` | Laatste fout voor dit punt |

**Groepen**

| Object | Type | Rol | Beschrijving |
|--------|------|-----|--------------|
| `groups.<g>.members` | string | `json` | Indexen van de leden-punten |
| `groups.<g>.active` | boolean | `indicator` | Groep is momenteel actief |

**Veiligheid**

| Object | Type | Rol | Beschrijving |
|--------|------|-----|--------------|
| `safety.interlockActive` | boolean | `indicator.alarm` | Veiligheidsvergrendeling momenteel actief |
| `safety.emergencyValve` | boolean | `indicator` | Noodklep is geopend |
| `safety.pumpRunning` | boolean | `indicator` | Pomp draait |
| `safety.openValveCount` | number | `value` | Aantal open kleppen |
| `safety.lastTripReason` | string | `text` | Reden van de laatste vergrendelingsactivering |

**Sensoren** (alleen aangemaakt wanneer de bijbehorende bewaking is ingeschakeld)

| Object | Type | Rol | Beschrijving |
|--------|------|-----|--------------|
| `sensors.oxygen` | number | `value` | Opgeloste zuurstof (mg/l) |
| `sensors.oxygenSaturation` | number | `value` | Zuurstofverzadiging (%) |
| `sensors.oxygenAlarm` | boolean | `indicator.alarm` | Zuurstof onder de ondergrens |
| `sensors.airTemperature` | number | `value.temperature` | Luchttemperatuur (°C) |
| `sensors.waterTemperature` | number | `value.temperature` | Watertemperatuur (°C) |
| `sensors.pressure` | number | `value.pressure` | Systeemdruk (bar) |
| `sensors.pressureAlarm` | boolean | `indicator.alarm` | Druk buiten bereik |

**Astronomie & locatie**

| Object | Type | Rol | Beschrijving |
|--------|------|-----|--------------|
| `astro.sunrise` / `astro.sunset` / `astro.solarNoon` | string | `text` | Zontijden voor de locatie |
| `astro.isNight` | boolean | `indicator` | Het is momenteel nacht |
| `location.latitude` / `location.longitude` | number | `value.gps.*` | Bepaalde coördinaten |
| `location.resolvedAddress` | string | `text` | Bepaald adres |

**Feeder-koppeling** (alleen aangemaakt wanneer de feeder-koppeling is ingeschakeld)

| Object | Type | Rol | Beschrijving |
|--------|------|-----|--------------|
| `feeder.pauseActive` | boolean | `indicator` | Beluchting gepauzeerd voor het voeren |
| `feeder.pauseUntil` | number | `value.time` | Pauze actief tot |
| `feeder.lastFeedStart` | number | `value.time` | Laatste voederstart |

**Statistieken**

| Object | Type | Rol | Beschrijving |
|--------|------|-----|--------------|
| `statistics.compressorRuntimeTodayH` | number | `value` | Compressorlooptijd vandaag (uren) |
| `statistics.switchCyclesToday` | number | `value` | Klepschakelcycli vandaag |

Wanneer een punt, groep of sensor uit de configuratie wordt verwijderd, worden de bijbehorende
objecten automatisch opgeruimd.

## 7. Roadmap

Zie [PROJECT_PLAN.md](../../PROJECT_PLAN.md) voor het volledige, op mijlpalen gebaseerde
implementatieplan (besturingslogica, HAL-backends, ESP32-firmware, bewaking, feeder-koppeling,
wintermodus en de daaropvolgende vis-2-widget-adapter).

---

📖 [Hoofddocumentatie (Engels)](../../README.md)
