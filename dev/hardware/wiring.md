# Verdrahtung & Leistung (24 V DC Ventile, 230 V AC Pumpe) — M7

> **Status:** Verbindliche Verdrahtungs-/Auslegungs-Referenz für den ESP32-Aufbau (M7). Recherche
> **2026-07-08** (Quellen am Ende). **Betriebsspannungen (Nutzervorgabe):** Waveshare-Board + Ventile
> **24 V DC (SELV)**, Pumpe voraussichtlich **230 V AC** über Relais. **Montage getrennt möglich:**
> ESP32 im Technikraum, Ventile am Teich → Leitungslänge/-querschnitt beachten (Abschnitt 3).

## 1. Relais des Waveshare ESP32-S3-POE-ETH-8DI-8RO

- **Kontaktbelastbarkeit (Waveshare-Angabe):** **≤ 10 A 250 V AC** bzw. **≤ 10 A 30 V DC** je Kanal.
- **Typ:** **SPDT / 1 Wechsler pro Kanal**, Klemmen **COM + NO + NC** herausgeführt → NO **und** NC je
  Kanal verfügbar (genau das, was die Failsafe-Verdrahtung braucht, Abschnitt 2).
- Angesteuert über **TCA9554** (I²C 0x20); Steuer-/Lastseite **optokoppler- + netzteilisoliert**, TVS.
  ⚠️ Die Isolation schützt den MCU — sie erhöht **nicht** die Kontakt-Grenzwerte.
- ⚠️ Waveshare nennt **keine Relais-Teilenummer/keine separate Motor-(AC-3)-Angabe** — nur die
  gedruckten „≤10 A" gelten als Design-Limit. Für eine dokumentierte AC-3/PS-Zahl das Relais vom
  Schaltplan/Gehäuse ablesen und dessen Datenblatt ziehen.

## 2. Failsafe-Verdrahtung (stromlos = sicher)

Relais fallen bei Stromausfall ab → den **stromlosen** Zustand zum **sicheren** machen:

| Aktor | Kontakt | Stromlos |
|-------|---------|----------|
| Belüftungsventile | **NC** | **ZU** (Adapter bestromt Relais zum Öffnen) |
| Notventil | **NO** | **AUF** (Pumpe kann immer entlüften) |
| Pumpe | so verdrahten, dass stromlos = **AUS** | AUS |

Passt 1:1 zur Adapter-Logik (siehe `dev/hardware/…`, Handbuch-Kapitel „Ausfallsichere Verdrahtung").

## 3. 24 V DC Ventile — Leitungslänge & Querschnitt (Technikraum → Teich)

- **Last:** kleines 24-V-DC-Magnetventil ≈ **2–8 W → ≈ 0,08–0,33 A** Halten (z. B. Bürkert 6011 =
  4 W / 0,167 A). ⚠️ **DC hat KEINEN AC-typischen Einschaltstrom** → auf den **Haltestrom** auslegen.
- **Spannungsabfall (Zweileiter, Hin+Rück):** `Vab = 2 · L · I · R′` (L = einfache Länge, R′ =
  Ω/m des Leiters). **Rein ohmsch** (0 Hz, keine Reaktanz) → Querschnitt allein aus dem Spannungsabfall.
  R′ (Cu, 56 m/Ω·mm²): 0,5 mm²=0,0357 · 0,75=0,0238 · 1,0=0,0179 · 1,5=0,0119 · 2,5=0,00714 Ω/m.
- **Ziel ≤ 5 % Abfall (≈ 1,2 V)**, hartes Limit **≤ 10 % (≈ 2,4 V)** (Spulen ±10 %, ziehen ~85 % an).
- **Max. einfache Länge (m)** — Beispiel **I = 0,167 A** (4-W-Ventil), Ziel ≤5 % / Limit ≤10 %:

  | Querschnitt | ≤5 % | ≤10 % |
  |---|---|---|
  | 0,5 mm² | ~100 m | ~200 m |
  | 0,75 mm² | ~150 m | ~300 m |
  | 1,0 mm² | ~200 m | ~400 m |
  | 1,5 mm² | ~300 m | ~600 m |
  | 2,5 mm² | ~500 m | ~1000 m |

  (Länge ∝ 1/Strom: bei **0,5 A** viertelt sich die Reichweite grob → 0,5 mm² ~34 m, 1,5 mm² ~100 m.)
- **Praxis-Default (0,167-A-Ventil, ≤5 %):** **10 m → 0,75 mm² · 30 m → 0,75 mm² · 50 m → 1,0 mm² ·
  100 m → 1,5 mm².** Doppelter Strom → eine Stufe größer bzw. halbe Distanz.
- **Wenn Kupfer unwirtschaftlich wird** (grob > 2,5 mm² pro Ventil / > 100 m @ 0,5 A / viele Ventile):
  1. **Lokales 24-V-Netzteil + Relais am Teich** (Fernleitung führt nur das Signal) — bester Weg, skaliert.
  2. **Versorgung leicht höher** (Leerlauf ~25–26 V, im Rahmen +10 % der Spule) kauft eine Stufe.
  3. **Höhervoltiges Ventil** (48 V DC, weiterhin **SELV**): halber Strom → viertel %-Abfall.
  **24 V SELV möglichst behalten** — berührungssicher am/ im Wasser (klarer Vorteil ggü. 230-V-Ventilen).
- ⚠️ **Freilaufdiode über JEDE Ventilspule** (Induktivität → Abschalt-Spike hunderte–>1000 V, frisst
  Relaiskontakte): Diode **antiparallel an der Spule** (Kathode an +24 V), **≥ 50 V / ≥ Spulenstrom**
  (z. B. **1N4007**), idealerweise **am Ventil** montiert (hält Transiente von der langen Leitung fern).

## 4. 230 V AC Pumpe schalten

- **10 A ist eine OHMSCHE Angabe — für Motoren derating!** Motor = Anlaufstrom (**LRA ~6–7×**, bis 10×)
  + AC-3 statt AC-1. Faustregel: dauerhaft **~40–50 % der Kontaktangabe** (≈ 4–5 A) und LRA-Spitze klar
  unter der Schaltleistung halten.
- **Typische Teich-Luftpumpen ~45–250 W → ~0,2–1,1 A @ 230 V** → **direkt über das Board-Relais mit
  großer Reserve** schaltbar. **RC-Snubber** über die Kontakte für Lichtbogenschutz/Kontaktlebensdauer.
- **Grün (Relais direkt):** bis ~**500 W** (FLA ≲ 2 A) — deckt alle üblichen Teich-Luftpumpen.
  **Grau (derating + Snubber, Anlauf beachten):** ~500 W–1 kW. **Schütz (AC-3) verwenden:** über
  **~1 kW / FLA ≳ 4 A**, bei Kolben-/Drehschieberpumpen mit hohem Anlauf, oder wenn das Netz **galvanisch**
  vom Kleinspannungs-Board getrennt sein soll (Relais schaltet dann nur die Schützspule).
- **Membran-/Linearpumpen** (Schwingankerpumpen) haben moderaten Anlauf → Relais schafft sie leicht;
  echte Induktionsmotoren (Kolben/Drehschieber) sind der Schütz-Fall, sobald sie größer werden.

## 5. Trennung & Sicherheit

- **230 V AC getrennt führen, eigene Absicherung, idealerweise Schütz.** Netz landet sonst wenige mm
  neben der 24-V-DC-Verdrahtung auf der Klemme.
- **230 V AC und 24 V DC nicht auf benachbarten Relaiskanälen mischen** (Kriech-/Luftstrecken): Netz-
  Kanäle gruppieren, 24-V-Kanäle gruppieren, im Gehäuse/Kabelweg trennen. Netz separat absichern; Motor
  über eigenes AC-3-Schütz galvanisch von der Steuerung trennen.
- **Außenverlegung 24 V:** UV-fest/erdverlegbar (H07RN-F bzw. NYY-J im Erdreich/Rohr), IP68-Verbinder/
  -Verschraubungen (Ventilstecker DIN 43650 ~IP65), Zugentlastung, **abseits von Netzleitungen** (90°
  kreuzen). Etwas größerer Querschnitt als das elektrische Minimum = mechanische Reserve.

## Quellen
- Waveshare Wiki ESP32-S3-(POE-)ETH-8DI-8RO (Relais ≤10 A 250 VAC/30 VDC, COM/NO/NC, TCA9554);
  ESPHome-Devices; OpenELAB; Cirkit Designer.
- Omron Relais-Applikationsnotizen (Inrush ~10×, Derating inductive); IEC AC-1 vs AC-3 (25 A→~9 A).
- Teich-Luftpumpen-Leistungen (FujiMAC MAC250/300RII; thepondreport; boxerpumps).
- Bürkert 6011 Datenblatt (4 W DC, ±10 %, kein DC-Inrush); BetaValve (kein DC-Inrush); Cu-Widerstands-
  tabellen (tlc-direct, engineeringtoolbox); Freilaufdiode (Wikipedia/electronicshub/control.com);
  RapidTables Voltage-Drop.
