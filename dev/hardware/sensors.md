# Referenz-Sensorik (ESP32) — Festlegung für M7

> **Status:** Verbindliche Referenz-Hardware für den ESP32-Direktbetrieb (M7). Stand der
> Recherche: **2026-07-08**. Die Sensoren hängen **am ESP32** (nicht als separate ioBroker-
> Instanz). Das Sensor-**Quellen-/Typ-Modell** wird in M7 umgesetzt: pro Messgröße wählbar
> **„ESP32-Sensor (Typ X)"** *oder* **„vorhandener ioBroker-State"** (rückwärtskompatibel zum
> heutigen Stand). Der **Typ** ist als Enum ausgelegt, damit später weitere getestete
> Hardwarevarianten hinzukommen können (Nutzerwunsch). Preise sind Richtwerte inkl. dt. MwSt.,
> soweit die Shops Brutto anzeigen; Quellen am Ende jedes Abschnitts.

## Überblick

| Messgröße | Referenz-Bauteil | Bus / Adresse | Preis (real, DE) | Pflicht? |
|-----------|------------------|---------------|------------------|----------|
| Wassertemperatur | **DS18B20** (wasserdicht) | 1-Wire (GPIO1/2) | ~€2,70 (berrybase) | empfohlen |
| Leitungsdruck | **CFSensor XGZP6897D…KPDG** | I²C 0x6D *(oder 0x58)* | ~€8–12 (AliExpress) | optional |
| Gelöst-Sauerstoff (O₂) | **Atlas EZO-DO** (Premium) *oder* **DFRobot SEN0237-A** (Budget) | I²C 0x61 / Analog | ~€435–460 / ~€180 | **optional** |

**Wichtige Verkettung:** Der **Wassertemperatur-Wert (DS18B20)** speist die **O₂-Kompensation**
(bei EZO-DO über `RT,<temp>`, bei DFRobot die temperaturabhängige Sättigungsrechnung in der
Firmware) sowie die vorhandene `sensors.oxygenSaturation`-Berechnung des Adapters. Das
Sensor-Modell in M7 muss diese Abhängigkeit abbilden.

---

## 1. Wassertemperatur — DS18B20 (1-Wire)

- **Referenz:** wasserdichte **Edelstahl-Sonde** (typ. 6×50 mm, PVC-Kabel: rot=VDD, schwarz=GND,
  gelb=DQ), **3-Leiter-Normalbetrieb** (nicht Parasit — zuverlässiger bei langem Kabel).
- **Verdrahtung:** VDD→3,3 V, GND→GND, DQ→**GPIO1** oder **GPIO2** (freie, nicht-Strapping-Pins
  am ESP32-S3), **4,7 kΩ Pull-up** DQ→3,3 V. Bei langem Teichkabel Pull-up auf ~2,2 kΩ senken,
  geschirmtes Twisted-Pair (DQ+GND gepaart), 100 nF an der Sonde. ⚠️ **Header-Belegung am
  Silkscreen prüfen** (Waveshare veröffentlicht keine Pinout-Tabelle).
- **Eigenschaften:** Family-Code **0x28**; mehrere Sonden (Wasser+Luft) an **einem** GPIO über die
  64-bit-ROM-Adresse; −55…+125 °C, ±0,5 °C; 12-bit = 750 ms Wandlung.
- ⚠️ **Fälschungsrisiko:** Der Großteil billiger eBay/AliExpress-DS18B20 ist gefälscht (außerhalb
  ±0,5 °C, kein EEPROM, verrauscht). Für die geforderte Genauigkeit **autorisierten Distributor**
  nutzen; echt = Laser-Ätzung „DALLAS 18B20", ROM `28-xx-…-00-00-xx`.
- **Bezug (DE):** **berrybase.de €2,70** (1 m, lagernd) · eckstein-shop.de €4,35 (autor. Adafruit/
  SparkFun, inkl. 4,7 kΩ) · reichelt.de €6,15–6,99 · AliExpress €0,30–1 (⚠️ Fälschung). Für ±1 °C
  im Teich (0–40 °C) reicht eine seriöse Reseller-Sonde; für ±0,5 °C autorisierten Distributor.
- **Firmware-Libs:** Arduino `OneWire` + `DallasTemperature`; ESP-IDF `espressif/onewire_bus` +
  `espressif/ds18b20` (RMT-basiert, passend für den ESP32-S3).
- Quellen: analog.com DS18B20-Datenblatt; Maxim AN148 (Long-Line 1-Wire); berrybase.de;
  eckstein-shop.de; github.com/cpetrich/counterfeit_DS18B20.

---

## 2. Leitungsdruck — CFSensor XGZP6897D (I²C)

Überwacht den **Luft-Sammelleitungsdruck** (Dead-Head-Erkennung, Leck, Diffusor-Verstopfung).

- **Bestellnummer/Bereich (Positiv-Überdruck, Gauge = 1 Port):**
  - **`XGZP6897D100KPDG`** — 0–100 kPa (0–1 bar), **K = 64**. **Default** (deckt Dead-Head/Anlauf ab).
  - `XGZP6897D050KPDG` — 0–50 kPa, **K = 128**.
  - `XGZP6897D020KPDG` — 0–20 kPa, **K = 256**.
  - **Bereichswahl:** Eine Membran-/Kolbenpumpe liefert an der Sammelleitung real oft nur
    **wenige kPa bis ~20–30 kPa** → die **kleinere Variante gibt bessere Auflösung**, muss aber den
    **Worst-Case-Druck (verschlossene Ventile/Anlauf)** aushalten. **Empfehlung: 0–100 kPa als
    sichere Referenz, nach einmaligem Messen des realen Drucks ggf. auf 0–50/0–20 kPa wechseln.**
- ⚠️ **Zwei Silizium-Generationen unter gleichem Namen:**
  - **non-C** (`XGZP6897D…`) → **I²C 0x6D**, ≤ Datenblatt V3.0.
  - **C-Serie** (`XGZP6897D**C**…`) → **I²C 0x58**, andere Registerkarte, Datenblatt V3.1+.
  - Beim AliExpress-Kauf ist die Generation **nicht steuerbar** → **Firmware muss beide Adressen
    (0x6D und 0x58) automatisch abtasten** und den passenden Registersatz wählen.
- **Protokoll (non-C, 0x6D):** `0x30 ← 0x0A` (kombinierte Wandlung starten), Bit 3 pollen bis frei;
  dann **5 Bytes ab 0x06** lesen. Druck = **24-bit** (0x06/0x07/0x08, Zweierkomplement),
  `Druck[Pa] = signed24 / K`. Temp = **16-bit** (0x09/0x0A), `°C = signed16 / 256`. Bus bis 400 kHz.
- **Elektrik:** 2,5–5,5 V (bei 3,3 V nativ, kein „33"-Werksoption nötig); **Pull-ups 4,7 kΩ**;
  **100 nF** an VDD. Genauigkeit **±2 % Span** (10–200 kPa), **kompensiert nur 0–60 °C**;
  Langzeitdrift ±1 % FSS/Jahr; Ansprechzeit 2,5 ms; nur **nicht-korrosives Gas/Luft**.
- ⚠️ **Nicht kondensations-fest, nicht wasserdicht, Die praktisch unbeschichtet.** Feuchte Teichluft
  ist ein echtes Problem → **trockener Dead-Leg/Beruhigungsvolumen + Kondensat-Falle/Drip-Loop**,
  **Barb nach unten**, Sensor über Taupunkt/warm halten, ggf. hydrophobe PTFE-Membran. Ein langer
  dünner Messschlauch dämpft zusätzlich die Pumpenpulsation.
- **Plumbing:** SOP8 mit 2 Top-Ports (Barb-OD ~3,17 mm, Bohrung Ø0,9 mm). Bei der **DG**-Variante
  einen Port über einen **Dead-End-Tee** an die Sammelleitung, der andere (Atmosphäre-Vent) offen.
- **Bezug:** ⚠️ **Kein EU-Distributor führt die Gauge-Variante (KPDG)** — DigiKey/Mouser/SOS/Conrad/
  reichelt führen nur differenzielle **DPN**-Teile im Mikrobereich (≤1 kPa, unbrauchbar). →
  **0–20/50/100 kPa Gauge nur via AliExpress / Alibaba (CFSensor-Store) / CFSensor-direkt, ~€8–12
  geliefert.** Das AliExpress-Modul (Sensor auf kleiner Platine + Barb + VDD/GND/SDA/SCL) IST
  praktisch das Breakout.
- **Firmware-Libs:** Arduino `fanfanlatulipe26/XGZP6897D` (ESP32-S3 getestet, K im Konstruktor,
  **nur non-C 0x6D**); ESPHome `xgzp68xx` (`k_value`). ⚠️ K-Tabellen von Lib vs ESPHome weichen bei
  ≤1 kPa um Faktor 2 ab → K aus dem Datenblatt der konkreten Variante nehmen (bei ≥20 kPa
  unkritisch).
- Quellen: cfsensor.com/product/xgzp6897d; Datenblatt V2.4 (soselectronic-Mirror);
  github.com/fanfanlatulipe26/XGZP6897D; esphome.io/components/sensor/xgzp68xx; digikey.de;
  AliExpress-Modul (item 1005003262065238).

---

## 3. Gelöst-Sauerstoff (O₂) — **optional**, zwei Wege

O₂ ist die **teuerste und wartungsintensivste** Messgröße — teichtaugliche DO-Messung kostet
mehrere hundert Euro und braucht regelmäßige Membran-/Elektrolytpflege, egal welche Variante.
Deshalb **optional**. Dokumentiert sind ein **Budget-Default** und eine **Premium-Referenz**.

### 3a. Budget-Default — DFRobot Gravity: Analog DO (SEN0237-A)

- **Schnittstelle:** **analog 0–3,0 V** → braucht einen ADC. Der ESP32-S3-ADC ist verrauscht/
  nichtlinear → **externen ADC empfohlen: ADS1115 (I²C, ~€5)**.
- **Grenzen:** kein ±-Genauigkeits-Spec; **manuelle Ein-/Zweipunkt-Kalibrierung + Temp-Kompensation
  in der Firmware**; **keine galvanische Isolation** (Masseschleifen-Risiko mit anderen Nass-Sonden);
  galvanische Sonde: **Membrankappe alle 1–2 Monate im Teichwasser**, NaOH-Füllung ~monatlich,
  Elektrode ~1 Jahr.
- **Bezug (DE):** **DigiKey.de €176,27 inkl. MwSt** (lagernd, MOQ 1) · Mouser.de ~€150–175 ·
  berrybase.de gelistet. AliExpress ~€175 (**nicht billiger**; generische „DO"-Kits sind meist
  dasselbe DFRobot-Design umgelabelt). Verbrauch: Membrankappe **FIT0575** ~€18–22 + NaOH.
- Quellen: dfrobot.com/product-1628; wiki.dfrobot.com/sen0237-a; digikey.de SEN0237-A.

### 3b. Premium-Referenz — Atlas Scientific EZO-DO + galvanische Sonde

- **Schnittstelle:** **I²C 0x61**, 3,3 V nativ (⚠️ UV-Warnung bei ≤3,1 V → sauberer Rail).
  Liefert **kalibriertes mg/L + %-Sättigung** direkt; **Onboard-Kompensation** über
  `RT,<wassertemp>` (900 ms, Temp+Messwert in einem Call; ⚠️ Temp **nicht** über Power-Loss gehalten
  → nach Boot neu pushen), Salinität `S,0` (Süßwasser), Luftdruck `P,<kPa>` optional. Genauigkeit
  ±0,2 mg/L (Sonde). Lesen: `R` → 600 ms → lesen.
- ⚠️⚠️ **Galvanische Isolation praktisch Pflicht** (Atlas: „never build a commercial product without
  electrical isolation"): die DO-Schaltung liest Mikrovolt-Leckströme von Pumpe/Magnetventilen →
  schwankende Werte; zudem kann eine stromlos geschaltete, **nicht-isolierte EZO den gemeinsamen
  I²C-Bus lahmlegen**. → **Atlas Electrically Isolated EZO Carrier Board Gen 2** einplanen.
- ⚠️ **Galvanische Sonde braucht Strömung** an der Membran (stiller Teich → nahe Umwälzung
  montieren); Betrieb 1–60 °C (nicht einfrieren); Elektrolyt/Membran = Verschleiß ~6–12 Monate.
- **Bezug (DE):** Atlas-Händler **exp-tech.de** — EZO-DO-Circuit ~€66, **Lab-Grade-Sonde ~€285–300**
  (Kostentreiber!), Isolator-Carrier €31,31, Wartungskit ~€52–77. **Stack ~€435–460.** ⚠️ **Nicht**
  über AliExpress kaufen (dort nur Fälschungen). Alternative: Paket **KIT-103DX** ~€380–420.
- **Firmware-Lib:** `Atlas-Scientific/Ezo_I2c_lib` (Arduino, läuft auf ESP32-S3).
- Quellen: atlas-scientific.com (EZO-DO, DO-Probe, Isolated-Carrier, Membran-Kit); exp-tech.de;
  files.atlas-scientific.com/DO_EZO_Datasheet.pdf.

> **Ausblick:** Optische/Fluoreszenz-DO-Sonden (z. B. DFRobot RS485, ~€200+) sind genauer und
> quasi wartungsfrei (keine Membran/Elektrolyt) — als spätere „premium, low-maintenance"-Option
> denkbar, aber RS485 statt I²C.

---

## 4. Integration am Waveshare ESP32-S3-POE-ETH-8DI-8RO

- **I²C-Bus:** SDA **GPIO42**, SCL **GPIO41** (geteilt). **Adress-Map kollisionsfrei:**
  `0x20` Relais-Expander (TCA9554) · `0x51` RTC (PCF85063) · `0x61` EZO-DO · `0x6D`/`0x58`
  XGZP6897D. ⚠️ Kein neuer EZO auf 0x6x, der mit 0x61/0x6D kollidiert.
- ⚠️ **Nur EIN Pull-up-Paar am gesamten Bus** — das Board hat bereits Pull-ups (für TCA9554+RTC).
  Viele Sensor-Breakouts bringen **eigene** mit → **entfernen/deaktivieren**, sonst übersteift der
  Bus. (Der Atlas-Isolator hat auf der isolierten Seite ein eigenes 4,7-kΩ-Paar — separate Domäne,
  ok.)
- **Pegel:** alle drei Sensoren bei **3,3 V → kein Level-Shifting**.
- **1-Wire-GPIO (DS18B20):** frei & sicher: **GPIO1 / GPIO2** (nicht-Strapping, nicht Flash/PSRAM);
  Alt.: GPIO21 (⚠️ auf der -8DO-Schwester RS485-RTS → prüfen), GPIO40. **Am Silkscreen prüfen**,
  welche am Header herausgeführt sind — **kein publizierter Schaltplan/Header-Pinout**.
- **Belegte Pins (Korrekturen):** GPIO39 = ETH_RST (W5500); GPIO45/47/48 = microSD (SD_MMC);
  GPIO43/44 = UART0-Konsole; GPIO0/3/45/46 = Strapping; GPIO19/20 = USB.
- **PoE-Budget:** 802.3af ~12,95 W; Sensoren ~15–20 mA (<0,1 W) → **vernachlässigbar** (nur die
  Relaisspulen zählen).
- **Kabelstrategie (I²C ist kurz, ≤~1–3 m / 400 pF):** **EZO-Circuit + Drucksensor ins Gehäuse**;
  nur **DO-Sonde (geschirmt) + Luftschlauch + DS18B20** gehen nach außen/ins Wasser. Bei langem I²C:
  Takt senken, LTC4311 (Aktiv-Pull-up) oder PCA9615/P82B96 (Differenz-Extender). EZO notfalls per
  **UART** statt langem I²C. Der **DS18B20** ist der Einzige, der lang ins Wasser geht (10–15 m
  @ 4,7 kΩ problemlos).
- **Waveshare-Demo:** enthält `I2C_Driver.h/.cpp` (`I2C_Init()=Wire.begin(42,41)`, `I2C_Read/Write`)
  + Beispiele für TCA9554 (0x20) und PCF85063 — die Zusatzsensoren einfach mit 0x61/0x6D ansprechen.
- Quellen: waveshare.com/wiki/ESP32-S3-ETH-8DI-8RO (+ POE-Variante); Demo-ZIP;
  devices.esphome.io/devices/waveshare-esp32-s3-eth-8di-8ro; Tasmota #24205; analog.com LTC4311.

---

## 5. Design-Konsequenzen für den Adapter/M7

1. **Sensor-Quellen-/Typ-Modell:** pro Messgröße `sourceType = ioBrokerState | esp32Sensor` und bei
   `esp32Sensor` ein `sensorType`-Enum (Default = Referenz-Bauteil dieses Dokuments), erweiterbar um
   künftig getestete Varianten. Rückwärtskompatibel zum heutigen `*ObjectId`-State-Weg.
2. **Drucksensor: 0x6D UND 0x58 automatisch abtasten** und den passenden Registersatz/K wählen.
3. **Wassertemp → O₂-Kompensation verketten** (EZO `RT,<temp>` bzw. DFRobot-Sättigungsrechnung) und
   in `sensors.oxygenSaturation` weiterverwenden.
4. **Druck-Default 0–100 kPa**, konfigurierbarer Bereich; Warnung wenn gewählter Bereich < realem
   Anlauf-/Dead-Head-Druck.
5. **O₂ bleibt optional**; DFRobot als Budget-Weg (ADS1115 + Firmware-Kalibrierung/-Kompensation),
   Atlas EZO-DO als Premium (kalibriertes I²C-mg/L + Isolation).

---

## 6. Grobe Materialkosten (Sensorik, real DE, ohne Board/Relais)

| Ausbau | Zusammenstellung | ~Summe |
|--------|------------------|--------|
| **Nur Umwälzung/Sicherheit** | keine Sensoren (Adapter läuft ohne) | €0 |
| **Basis** | DS18B20 (€2,70) + XGZP6897D (€10) | **~€13** |
| **Budget + O₂** | Basis + DFRobot SEN0237-A (€176) + ADS1115 (€5) | **~€194** |
| **Premium + O₂** | Basis + Atlas EZO-DO-Stack (€450) | **~€463** |

O₂ dominiert die Kosten; Druck + Temperatur zusammen kosten nur ~€12–15.
