# Zielhardware: Waveshare ESP32-S3-POE-ETH-8DI-8RO

> Datenblatt-/Referenzdokument für die **M7**-Firmware und den ESP32-Backend des Adapters
> `ioBroker.automatic-pond-aeration`. Quelle: Waveshare-Wiki, Produktseiten, devices.esphome.io
> (Stand 2026-07-07). Alle Angaben ohne Gewähr — vor sicherheitsrelevantem Einsatz mit dem
> offiziellen Schaltplan abgleichen.

**Industrielles 8-Kanal-ESP32-S3-Relaismodul (PoE-Ethernet-Version).** PoE-Variante des
`ESP32-S3-ETH-8DI-8RO` — beide Versionen teilen Wiki, Schaltplan, Demos und Firmware.
Unterstützt WLAN, Bluetooth LE, Ethernet (mit PoE), isoliertes RS485 sowie 8 optokoppler-
isolierte Digitaleingänge; Hutschienen-ABS-Gehäuse.

| Eigenschaft | Wert |
|---|---|
| Hersteller | Waveshare |
| Modell | ESP32-S3-POE-ETH-8DI-8RO (PoE-Version des ESP32-S3-ETH-8DI-8RO) |
| Amazon-ASIN | B0F93TK7F5 |
| Einsatz | AIoT, Industrie, Smart Home, Modbus-Gateways |

## Technische Daten

**Controller & Speicher**
- Modul: **ESP32-S3-WROOM-1U-N16R8** (U = externer Antennenanschluss)
- CPU: Xtensa 32-Bit LX7 Dual-Core, bis 240 MHz
- Speicher: **16 MB Flash, 8 MB PSRAM**
- Funk: 2,4 GHz WLAN (802.11 b/g/n) + Bluetooth 5 LE (Dual-Mode)

**Relais (8× RO)**
- 8 Relais, Kontaktbelastbarkeit je Kanal **≤ 10 A / 250 V AC** bzw. **≤ 10 A / 30 V DC**
- Jedes Relais mit **COM + NO + NC** an Schraubklemmen
- Ansteuerung über I/O-Expander **TCA9554** (I²C, Adresse **0x20**), Relais = TCA9554 Pin 0–7
- Optokoppler-Isolation gegen Rückwirkungen der Lastseite
- „Linkage": Relais können direkt durch Digitaleingänge geschaltet werden

**Digitaleingänge (8× DI)**
- 8 Kanäle, passiv (potenzialfrei) oder aktiv nutzbar; bidirektionale Optokoppler-Isolation
- GPIO4–GPIO11, **invertiert**, INPUT_PULLUP

**Schnittstellen**
- **Ethernet:** W5500 (SPI), RJ45
- **PoE:** integriert, **IEEE 802.3af** (nur POE-Version)
- **RS485:** isoliert (Modbus-RTU), Werksdemo 9600 Baud, zuschaltbarer 120-Ω-Terminierungsjumper
- **USB-C:** Versorgung, Firmware-Flash, Debug
- **GPIO-Stiftleiste:** Erweiterung (RS232, Sensoren)
- **TF-Kartenslot:** Dateispeicher
- **RTC:** PCF85063 (I²C), Batteriehalter Größe 1220 — **nur wiederaufladbare 3–3,3-V-Zellen**

**Stromversorgung**
- Schraubklemme **7–36 V DC** Weitbereich, alternativ 5 V USB-C oder PoE (802.3af)
- Integrierte Netzteil-Isolation (Unibody) — keine separate Versorgung der isolierten Seite nötig

**Schutz & Anzeigen**
- Optokoppler-Isolation (Relais + DI), digitale Signalisolation, Netzteil-Isolation
- TVS-Diode gegen Überspannung/Transienten
- Summer, RGB-LED (WS2812), Status-LEDs (Power, RS485 TX/RX), Hutschienen-ABS-Gehäuse

## GPIO-/Pin-Belegung

| Funktion | Pin(s) / Adresse |
|---|---|
| Ethernet W5500 (SPI) | CLK GPIO15 · MOSI GPIO13 · MISO GPIO14 · CS GPIO16 · INT GPIO12 |
| I²C-Bus (TCA9554 + PCF85063) | SDA GPIO42 · SCL GPIO41 |
| RS485 (UART) | TX GPIO17 · RX GPIO18 |
| Digitaleingänge DI1–DI8 | GPIO4–GPIO11 (invertiert, INPUT_PULLUP) |
| Relais 1–8 | TCA9554 Pin 0–7 (I²C 0x20) |
| Summer | GPIO46 (LEDC / RTTTL) |
| RGB-LED (WS2812) | GPIO38 |
| Boot-Taster | GPIO0 |

## Software & Steuerungswege

- **Werksfirmware/Demos:** Arduino-IDE-basiert; Steuerung über WLAN (AP), Bluetooth, Netzwerkport,
  Web-Interface und Waveshare Cloud (MQTT). AP `ESP32-S3-POE-ETH-8DI-8RO`, Passwort `waveshare`.
- **RS485-Steuerung:** Relais per RS485-Kommandos schaltbar (9600 Baud).
- **ESPHome:** offiziell dokumentierte Community-Konfiguration (mit/ohne PoE). **WLAN und Ethernet
  können in ESPHome nicht gleichzeitig genutzt werden** — Standard-Config nutzt Ethernet.

## Praxishinweise (Wiki/FAQ)

- **RS485-Probleme:** 120-Ω-Jumper (Terminierung) setzen.
- **I/O-Expander:** TCA9554-Adresse ist 0x20.
- **Werksdemo:** nur zum Lernen; Produktivlogik selbst optimieren.
- **USB-Ausgabe (Arduino):** ggf. „USB CDC On Boot" aktivieren, damit `Serial` funktioniert.
- **RTC-Batterie:** ausschließlich wiederaufladbare 3–3,3-V-Zellen (1220).
- **ESPHome:** Ethernet und WLAN schließen sich aus.

## Varianten-Abgrenzung

| Modell | Unterschied |
|---|---|
| ESP32-S3-ETH-8DI-8RO | RS485, Ethernet **ohne** PoE |
| **ESP32-S3-POE-ETH-8DI-8RO** | **RS485, Ethernet mit PoE (802.3af) — dieses Produkt** |
| ESP32-S3-ETH-8DI-8RO-C | CAN statt RS485, ohne PoE |
| ESP32-S3-POE-ETH-8DI-8RO-C | CAN statt RS485, mit PoE |
| ESP32-S3-(POE-)ETH-8DI-8DO | 8 Transistorausgänge (Darlington, 500 mA sink) statt Relais |

## Links

| Ressource | URL |
|---|---|
| Wiki (Hauptdoku, Demos, FAQ) | https://www.waveshare.com/wiki/ESP32-S3-ETH-8DI-8RO |
| Wiki: Web-Steuerung (PoE) | https://www.waveshare.com/wiki/ESP32-S3-POE-ETH-8DI-8RO-Web |
| Wiki: Bluetooth (PoE) | https://www.waveshare.com/wiki/ESP32-S3-POE-ETH-8DI-8RO-Bluetooth |
| Wiki: RS485 (PoE) | https://www.waveshare.com/wiki/ESP32-S3-POE-ETH-8DI-8RO-RS485 |
| Wiki: Waveshare Cloud (MQTT) | https://www.waveshare.com/wiki/ESP32-S3-POE-ETH-8DI-8RO-Waveshare_Cloud |
| Produktseite | https://www.waveshare.com/esp32-s3-eth-8di-8ro.htm |
| ESP32-S3-Datenblatt (PDF) | https://files.waveshare.com/upload/f/f7/Esp32-s3_datasheet_en_(1).pdf |
| ESPHome-Devices (YAML + Pinout) | https://devices.esphome.io/devices/waveshare-esp32-s3-eth-8di-8ro/ |
| ESPHome-YAML-Quelle (GitHub) | https://github.com/esphome/devices.esphome.io — `src/docs/devices/Waveshare-ESP32-S3-ETH-8DI-8RO/` |
| ESPHome Ethernet-Doku | https://esphome.io/components/ethernet |
| Amazon.de (ASIN B0F93TK7F5) | https://www.amazon.de/dp/B0F93TK7F5 |
