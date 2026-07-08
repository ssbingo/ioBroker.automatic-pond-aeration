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

> 🛑 **WAARSCHUWING — ONTWIKKELINGSSTATUS, DIERENWELZIJN (lees dit).**
> Deze adapter is **nog volop in ontwikkeling en is NOG NIET geverifieerd voor onbeheerd gebruik.**
> Hij bestuurt een **levensondersteunend systeem voor levende dieren** – een storing, verkeerde
> configuratie of bug kan de beluchting stoppen en **de gezondheid en het leven van je vissen en het
> overige vijverleven in gevaar brengen** (zuurstoftekort, geen ijsvrij wak in de winter, een pomp
> die tegen gesloten kleppen draait). **Gebruik hem niet ongecontroleerd:** observeer hem vóór elk
> onbeheerd gebruik **nauwlettend en controleer elke functie** op je eigen hardware gedurende een
> betekenisvolle periode, en houd een onafhankelijke, beproefde beluchting/failsafe achter de hand.
> **Gebruik op eigen risico.** *(Deze kennisgeving blijft van kracht tot ze uitdrukkelijk wordt
> ingetrokken.)*

> ⚠️ **Projectstatus.** Volledig geïmplementeerd en configureerbaar vanuit de admin: de
> klepbesturing (tijdschema, cyclische roundrobin, groepen), de **veiligheidsvergrendeling** tegen
> dead-heading, de **bewaking** (zuurstof, lucht-/watertemperatuur, druk met alarmen),
> **astronomische tijden & geolocatie**, de **feeder-koppeling**, de **winter-/ijsvrijmodus**, de
> **zuurstofregelkring**, **meldingen via een messaging-adapter**, **looptijdstatistieken** en een
> **dry-run-testmodus**. **Nog gepland:** de directe **ESP32**-hardware-backend. Totdat de
> ESP32-backend er is, worden kleppen en pomp aangestuurd via bestaande ioBroker-states.

---

## Inhoudsopgave

1. [Wat de adapter doet](#1-wat-de-adapter-doet)
2. [Veiligheidsconcept](#2-veiligheidsconcept)
3. [Vereisten](#3-vereisten)
4. [Installatie](#4-installatie)
5. [Configuratie](#5-configuratie)
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

De kleppen en de pomp worden aangestuurd via **bestaande ioBroker-states** (van elke adapter die de
schakelaars beschikbaar stelt). Een directe **ESP32**-hardware-backend (zonder extra
ioBroker-instantie) is gepland.

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
* Eén of meer kleppen die als ioBroker-states bereikbaar zijn (bijv. een relais-/stekkeradapter).

## 4. Installatie

Installeer de adapter via de ioBroker-admin (of, tijdens de ontwikkeling, vanuit de
GitHub-repository) en maak een instantie aan. Open de instantie-instellingen om hem te configureren.

## 5. Configuratie

De instellingenpagina is ingedeeld in tabbladen. Je hoeft niet alles in te vullen – alleen de
onderdelen die je gebruikt.

### Algemeen
- **Hoofdvrijgave** – de aan/uit-schakelaar voor de hele adapter. Als deze uit staat, wordt er niets
  aangestuurd.
- **Dry-run (alleen loggen, geen hardware schakelen)** – de volledige besturingsengine draait en de
  datapunten worden bijgewerkt, maar klep-/pompcommando's worden alleen naar het log geschreven
  (`[DRY-RUN] would …`) in plaats van naar de echte states. Ideaal voor inbedrijfstelling en het
  testen van een configuratie voordat je alles bedraadt.
- **Hardware-backend** – `Bestaande ioBroker-states` (standaard) stuurt je kleppen/pomp aan via
  states van andere adapters. `ESP32 (direct)` is *gepland* (M7) en nog niet actief.
- **Pollinterval (s)** – hoe vaak de backendstatus wordt opgevraagd (bijv. `30`).

### Beluchtingspunten
Het hart van de configuratie. Voeg **maximaal 8** punten toe; elk punt is één klep. Per punt:
- **Naam** – bijv. `Pier`, `Deep zone`.
- **Ingeschakeld** – dit punt opnemen in de besturing.
- **Backend** – `ioBroker` (een vreemde state) of `ESP32` (een relaiskanaal, gepland).
- **Klep-state / kanaal** – kies voor de ioBroker-backend de schakelaar-state die de klep opent (via
  de objectbrowser); voor ESP32 het kanaalnummer.

### Groepen
Groepeer punten om ze samen te schakelen (bijv. één knop opent meerdere uitstromers). Geef de groep
een naam en vink de bijbehorende punten aan. **Er kunnen nooit meer groepen dan punten zijn.**

### Besturing
- **Cyclische roundrobin** – om de beurt door de punten schakelen, elk geopend gedurende de
  **verblijftijd** (seconden).
  - **Reeks (punten en groepen)** – definieer optioneel een **geordende cyclus van stappen**, waarbij
    elke stap één enkel **punt of een hele groep** aanstuurt en een eigen verblijftijd kan hebben. Zo
    kun je bijv. *groep 1 → groep 3 → punt 1 → …* draaien en punten en groepen vrij **mengen**. Herschik
    de stappen met de pijltjes omhoog/omlaag in de admin. Laat de reeks leeg om terug te vallen op de
    gewone roundrobin over alle punten.
- **Tijdschema's** – geselecteerde punten/groepen openen tijdens een tijdvenster per weekdag
  (`Van`/`Tot`, bijv. `08:00`–`18:00`; vensters die over de nacht heen lopen, zoals `22:00`–`06:00`,
  worden ondersteund). Een actief tijdschema heeft **voorrang op de roundrobin / reeks**.
- **Winter-/ijsvrijmodus** – tijdens het ingestelde seizoen (**Start**/**Einde** als terugkerende
  `MM-DD`, bijv. `11-01`–`03-15`, doorlopend over de jaarwisseling) worden de geselecteerde punten
  geforceerd ingeschakeld om een ijsvrij wak open te houden. Vink optioneel **Alleen wanneer het koud
  is (vorstbescherming)** aan en stel een **luchttemperatuurdrempel** in, zodat de vijver alleen wordt
  belucht wanneer het daadwerkelijk vriest (dit vereist luchttemperatuurbewaking). Laat **Open te
  houden punten** leeg om de hele vijver te beluchten. De wintermodus draait in de bedrijfsmodus
  `auto` en wijkt, net als elk programma, nog steeds voor de veiligheidsvergrendeling en een
  feeder-pauze.

### Sensoren
Optionele bewaking. Vink voor elke sensor **Ingeschakeld** aan en kies de **bron-state**:
- **Opgeloste zuurstof** – met een ondergrens (activeert `sensors.oxygenAlarm`), een streefwaarde en
  een hysterese; het **zuurstofverzadigings-%** wordt berekend uit de watertemperatuur.
  - **Zuurstofregelkring** – indien ingeschakeld, **forceert de adapter de beluchting aan** zolang de
    zuurstof onder de ondergrens ligt, en houdt deze aan totdat de streefwaarde weer wordt bereikt (of
    `low + hysteresis` als er geen streefwaarde is ingesteld). Laat **Geboostte punten** leeg om de
    hele vijver te boosten. Net als de wintermodus draait de regelkring in de modus `auto` en wijkt
    voor de veiligheid en feeder-pauzes.
- **Lucht-/watertemperatuur**.
- **Druk** – met min/max (buiten bereik activeert `sensors.pressureAlarm`).

### Locatie
Nodig voor de astronomische tijden (zonsopkomst/zonsondergang/nacht).
- **Locatiebron** – `ioBroker-systeemlocatie` (gebruikt je systeemcoördinaten) of `Eigen locatie`.
  Typ voor een eigen locatie een adres en druk op **Zoeken** (op aanvraag gegeocodeerd via
  OpenStreetMap/Nominatim) of klik/sleep de marker op de kaart.

### Feeder
Geselecteerde punten pauzeren terwijl
[ioBroker.automatic-feeder](https://github.com/ssbingo/ioBroker.automatic-feeder) aan het voeren is,
zodat het voer niet wordt weggeblazen.
- Kies de **feeder-instantie** (automatisch ontdekt) en vink de te bewaken **feeder-schakelaars** aan.
- **Duurmodus** – `Meten` bewaakt de schakelaar (pauze = voeren + offset, zonder de voedertijd vooraf
  te kennen); `Puls` gebruikt een vaste voedertijd.
- **Offset (s)** – extra pauze nadat het voeren stopt. **Deze moet minstens de gemiddelde tijd zijn
  die de dieren nodig hebben om te eten** (voorbeeld: 15 s voeren + 60 s offset ⇒ 75 s gepauzeerde
  beluchting).
- **Betrokken punten** – welke punten tijdens het voeren pauzeren.

### Veiligheid
- **Min. open kleppen terwijl de pomp draait** – de dead-heading-beveiliging (standaard `1`).
- **Watchdog-interval (s)** en **make-before-break-overlap (s)**.
- **Pomp** – of deze bestuurbaar is (dan kan de vergrendeling hem uitschakelen), zijn state en
  minimale aan-/uittijden tegen te snel schakelen.
- **Noodklep** – zijn state, of deze **normaal open** is (fail-safe), het klep**type** (magneetklep of
  gemotoriseerde kogelkraan) en, voor een motorklep, zijn **looptijd**.

### Meldingen
Schakel meldingen in en kies een **messaging-instantie** (elke adapter van het type `messaging`,
bijv. Telegram of Pushover). De adapter stuurt dan een kort, gelokaliseerd bericht wanneer de
veiligheidsvergrendeling in- of uitschakelt, wanneer het zuurstofalarm afgaat of herstelt, en wanneer
de druk zijn bereik verlaat of weer binnenkomt.

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
| `info.dryRun` | boolean | `indicator` | Dry-run actief (er wordt geen hardware geschakeld) |

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
| `sensors.oxygenBoostActive` | boolean | `indicator` | Zuurstofregelkring forceert de beluchting aan (alleen met ingeschakelde regelkring) |
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

**Winter-/ijsvrijmodus** (alleen aangemaakt wanneer de wintermodus is ingeschakeld)

| Object | Type | Rol | Beschrijving |
|--------|------|-----|--------------|
| `winter.active` | boolean | `indicator` | Wintermodus forceert momenteel de beluchting aan |
| `winter.frostActive` | boolean | `indicator` | Vorstbescherming is actief (koud genoeg) |

**Statistieken**

| Object | Type | Rol | Beschrijving |
|--------|------|-----|--------------|
| `aeration.point.<n>.runtimeTodaySec` | number | `value` | Looptijd van punt `<n>` vandaag (seconden) |
| `aeration.point.<n>.runtimeTotalH` | number | `value` | Totale looptijd van punt `<n>` (uren) |
| `statistics.compressorRuntimeTodayH` | number | `value` | Compressorlooptijd vandaag (uren) |
| `statistics.switchCyclesToday` | number | `value` | Klepschakelcycli vandaag |

Wanneer een punt, groep of sensor uit de configuratie wordt verwijderd, worden de bijbehorende
objecten automatisch opgeruimd.

## 7. Roadmap

Klaar: configuratie-UI, klepbesturing (tijdschema/roundrobin/groepen), de veiligheidsvergrendeling
tegen dead-heading, bewaking, astro & geolocatie, de feeder-koppeling, de winter-/ijsvrijmodus, de
zuurstofregelkring, meldingen, looptijdstatistieken en de dry-run-testmodus. **Nog te komen:**

* de directe **ESP32**-hardware-backend + referentiefirmware (Waveshare ESP32-S3-POE-ETH-8DI-8RO),
  incl. de referentiesensoren (opgeloste zuurstof, luchtleidingdruk, watertemperatuur) die op de
  ESP32 zijn aangesloten — zie [dev/hardware/sensors.md](../../dev/hardware/sensors.md);
* een **mobielvriendelijke webpagina die rechtstreeks door de ESP32 wordt geserveerd (verplicht op
  poort 80)** voor bediening en bewaking ter plaatse vanaf een telefoon — zonder ioBroker om hem te
  bedienen;
* een daaropvolgende **vis-2-widget-adapter** voor bediening en bewaking.

Zie [PROJECT_PLAN.md](../../PROJECT_PLAN.md) voor het volledige, op mijlpalen gebaseerde plan.

---

📖 [Hoofddocumentatie (Engels)](../../README.md)
